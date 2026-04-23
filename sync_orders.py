#!/usr/bin/env python3
"""
TakeOff Automotive - Amazon Orders Sync Script
Syncs FBM orders from Amazon SP-API to Supabase
Marketplaces: US (ATVPDKIKX0DER) + CA (A2EUQ1WTGCTBG2)
"""

import os
import json
import time
import requests
from datetime import datetime, timedelta, timezone

# ── Credentials from environment variables ──────────────────────────────────
AMAZON_CLIENT_ID     = os.environ.get("AMAZON_CLIENT_ID",     "amzn1.application-oa2-client.1cb8a62497034f7abf0472f488fc12d5")
AMAZON_CLIENT_SECRET = os.environ.get("AMAZON_CLIENT_SECRET", "")
AMAZON_REFRESH_TOKEN = os.environ.get("AMAZON_REFRESH_TOKEN", "")
SUPABASE_URL         = os.environ.get("SUPABASE_URL",         "https://rjuiqahxymkkazticljn.supabase.co")
SUPABASE_KEY         = os.environ.get("SUPABASE_KEY",         "")

MARKETPLACES = {
    "US": "ATVPDKIKX0DER",
    "CA": "A2EUQ1WTGCTBG2",
}

LOG_FILE = "/tmp/sync_log.txt"

def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass

# ── Amazon SP-API Auth ────────────────────────────────────────────────────────
def get_access_token():
    log("Fetching Amazon access token...")
    resp = requests.post(
        "https://api.amazon.com/auth/o2/token",
        data={
            "grant_type":    "refresh_token",
            "refresh_token": AMAZON_REFRESH_TOKEN,
            "client_id":     AMAZON_CLIENT_ID,
            "client_secret": AMAZON_CLIENT_SECRET,
        },
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    log("Access token obtained.")
    return token

# ── Fetch Orders from SP-API ──────────────────────────────────────────────────
def fetch_orders(access_token, marketplace_id, params_override=None):
    """Fetch one page (or all pages) of orders."""
    base_url = "https://sellingpartnerapi-na.amazon.com"
    headers = {
        "x-amz-access-token": access_token,
        "Content-Type": "application/json",
    }
    params = {
        "MarketplaceIds": marketplace_id,
        "FulfillmentChannels": "MFN",   # FBM only
        "MaxResultsPerPage": 100,
    }
    if params_override:
        params.update(params_override)

    all_orders = []
    url = f"{base_url}/orders/v0/orders"
    retries = 0

    while url:
        try:
            resp = requests.get(url, headers=headers, params=params if url.endswith("/orders") else None, timeout=60)
            if resp.status_code == 429:
                wait = 30 * (retries + 1)
                log(f"  Rate limited — waiting {wait}s...")
                time.sleep(wait)
                retries += 1
                continue
            resp.raise_for_status()
            data = resp.json()
            orders = data.get("payload", {}).get("Orders", [])
            all_orders.extend(orders)
            next_token = data.get("payload", {}).get("NextToken")
            if next_token:
                url = f"{base_url}/orders/v0/orders"
                params = {
                    "MarketplaceIds": marketplace_id,
                    "FulfillmentChannels": "MFN",
                    "NextToken": next_token,
                    "MaxResultsPerPage": 100,
                }
                retries = 0
                time.sleep(1)
            else:
                url = None
        except requests.exceptions.RequestException as e:
            log(f"  Request error: {e}")
            if retries < 3:
                retries += 1
                time.sleep(10 * retries)
            else:
                log("  Too many retries, skipping this pass.")
                break

    return all_orders

# ── Fetch Order Items ────────────────────────────────────────────────────────
def fetch_order_items(access_token, amazon_order_id):
    url = f"https://sellingpartnerapi-na.amazon.com/orders/v0/orders/{amazon_order_id}/orderItems"
    headers = {"x-amz-access-token": access_token}
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            if resp.status_code == 429:
                time.sleep(10 * (attempt + 1))
                continue
            if resp.status_code != 200:
                return []
            return resp.json().get("payload", {}).get("OrderItems", [])
        except Exception as e:
            log(f"  Error fetching items for {amazon_order_id}: {e}")
            time.sleep(5)
    return []

# ── Upsert to Supabase ────────────────────────────────────────────────────────
def upsert_order(order_data):
    url = f"{SUPABASE_URL}/rest/v1/orders"
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates",
    }
    resp = requests.post(url, headers=headers, json=[order_data], timeout=30)
    if resp.status_code not in (200, 201):
        log(f"  Supabase upsert error {resp.status_code}: {resp.text[:200]}")
        return False
    return True

def supabase_select(query_params):
    url = f"{SUPABASE_URL}/rest/v1/orders"
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    resp = requests.get(url, headers=headers, params=query_params, timeout=30)
    if resp.status_code != 200:
        return []
    return resp.json()

def supabase_update(amazon_order_id, data):
    url = f"{SUPABASE_URL}/rest/v1/orders"
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    params = {"amazon_order_id": f"eq.{amazon_order_id}"}
    resp = requests.patch(url, headers=headers, params=params, json=data, timeout=30)
    return resp.status_code in (200, 204)

# ── Parse Order ───────────────────────────────────────────────────────────────
def parse_order(order, marketplace_id, access_token):
    amazon_order_id = order.get("AmazonOrderId", "")
    status = order.get("OrderStatus", "").lower()

    # Map Amazon status → our status
    status_map = {
        "unshipped":        "pending",
        "partiallyshipped": "pending",
        "pending":          "pending",
        "shipped":          "shipped",
        "canceled":         "cancelled",
        "cancelled":        "cancelled",
        "invoice unshipped": "pending",
    }
    our_status = status_map.get(status, status)

    # Shipping address
    addr = order.get("ShippingAddress", {})
    ship_name    = addr.get("Name", "")
    ship_addr1   = addr.get("AddressLine1", "")
    ship_addr2   = addr.get("AddressLine2", "")
    ship_city    = addr.get("City", "")
    ship_state   = addr.get("StateOrRegion", "")
    ship_zip     = addr.get("PostalCode", "")
    ship_country = addr.get("CountryCode", "")

    customer_address = f"{ship_addr1}, {ship_city}, {ship_state} {ship_zip}, {ship_country}".strip(", ")

    # Buyer info
    buyer = order.get("BuyerInfo", {})
    customer_name  = buyer.get("BuyerName", ship_name)
    customer_phone = addr.get("Phone", "")

    # Price
    total = order.get("OrderTotal", {})
    amazon_price = float(total.get("Amount", 0.0))

    # Destination country
    destination_country = "CA" if marketplace_id == "A2EUQ1WTGCTBG2" else "US"

    # Order items
    items = fetch_order_items(access_token, amazon_order_id)
    time.sleep(0.5)  # rate limit courtesy

    asin     = ""
    quantity = 1
    if items:
        item = items[0]
        asin     = item.get("ASIN", "")
        quantity = item.get("QuantityOrdered", 1)
        if not amazon_price:
            ip = item.get("ItemPrice", {})
            amazon_price = float(ip.get("Amount", 0.0))

    return {
        "amazon_order_id":     amazon_order_id,
        "customer_name":       customer_name,
        "customer_address":    customer_address,
        "customer_phone":      customer_phone,
        "destination_country": destination_country,
        "marketplace":         marketplace_id,
        "asin":                asin,
        "quantity":            quantity,
        "amazon_price":        amazon_price,
        "status":              our_status,
        "ship_name":           ship_name,
        "ship_address1":       ship_addr1,
        "ship_address2":       ship_addr2,
        "ship_city":           ship_city,
        "ship_state":          ship_state,
        "ship_zip":            ship_zip,
        "ship_country":        ship_country,
        "order_items":         json.dumps(items),
        "updated_at":          datetime.now(timezone.utc).isoformat(),
    }

# ── Referral Fee Fetch ────────────────────────────────────────────────────────
def fetch_referral_fees(access_token):
    """Fetch referral fees for pending orders with referral_fee = 0."""
    log("Fetching referral fees for pending orders...")
    pending = supabase_select({
        "status":       "eq.pending",
        "referral_fee": "eq.0",
        "asin":         "neq.",
        "select":       "amazon_order_id,asin,amazon_price,marketplace",
    })
    log(f"  Found {len(pending)} pending orders without referral fee.")

    base_url = "https://sellingpartnerapi-na.amazon.com"
    headers  = {"x-amz-access-token": access_token}

    updated = 0
    for order in pending:
        asin         = order.get("asin", "")
        amazon_price = order.get("amazon_price", 0.0)
        marketplace  = order.get("marketplace", "ATVPDKIKX0DER")
        order_id     = order.get("amazon_order_id", "")

        if not asin or not amazon_price:
            continue

        try:
            resp = requests.get(
                f"{base_url}/products/fees/v0/items/{asin}/feesEstimate",
                headers=headers,
                params={
                    "MarketplaceId":      marketplace,
                    "IdType":             "ASIN",
                    "IsAmazonFulfilled":  "false",
                    "PriceToEstimateFees.ListingPrice.Amount":       str(amazon_price),
                    "PriceToEstimateFees.ListingPrice.CurrencyCode": "CAD" if marketplace == "A2EUQ1WTGCTBG2" else "USD",
                    "Identifier":         order_id,
                },
                timeout=30,
            )
            if resp.status_code == 200:
                data = resp.json()
                fee_list = data.get("payload", {}).get("FeesEstimateResult", {}).get("FeesEstimate", {}).get("FeeDetailList", [])
                referral_fee = 0.0
                for fee in fee_list:
                    if fee.get("FeeType") == "ReferralFee":
                        referral_fee = float(fee.get("FeeAmount", {}).get("Amount", 0.0))
                        break
                if referral_fee > 0:
                    supabase_update(order_id, {"referral_fee": referral_fee})
                    updated += 1
            time.sleep(0.3)
        except Exception as e:
            log(f"  Fee fetch error for {order_id}: {e}")

    log(f"  Updated referral fees for {updated} orders.")

# ── Protected statuses (never overwrite) ─────────────────────────────────────
PROTECTED_STATUSES = {"approved", "rejected"}

def should_update_status(existing_status, new_status):
    if existing_status in PROTECTED_STATUSES:
        return False
    return True

# ── Main Sync ─────────────────────────────────────────────────────────────────
def sync_marketplace(access_token, name, marketplace_id):
    log(f"\n{'='*50}")
    log(f"Syncing {name} marketplace ({marketplace_id})...")

    now      = datetime.now(timezone.utc)
    ago_90   = (now - timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")
    ago_2h   = (now - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")

    passes = [
        ("Recent (2h)",       {"CreatedAfter": ago_2h}),
        ("All Unshipped 90d", {"OrderStatuses": "Unshipped,PartiallyShipped", "CreatedAfter": ago_90}),
        ("All Pending 90d",   {"OrderStatuses": "Pending", "CreatedAfter": ago_90}),
    ]

    total_upserted = 0

    for pass_name, extra_params in passes:
        log(f"\n  Pass: {pass_name}")
        orders = fetch_orders(access_token, marketplace_id, extra_params)
        log(f"  Fetched {len(orders)} orders from Amazon.")

        for order in orders:
            try:
                parsed = parse_order(order, marketplace_id, access_token)
                order_id = parsed["amazon_order_id"]

                # Check if already in DB with protected status
                existing = supabase_select({
                    "amazon_order_id": f"eq.{order_id}",
                    "select": "status",
                })

                if existing:
                    ex_status = existing[0].get("status", "")
                    if not should_update_status(ex_status, parsed["status"]):
                        parsed.pop("status", None)  # Don't overwrite protected status

                success = upsert_order(parsed)
                if success:
                    total_upserted += 1

            except Exception as e:
                log(f"  Error processing order {order.get('AmazonOrderId','?')}: {e}")

        log(f"  Upserted {total_upserted} orders so far.")
        time.sleep(2)  # between passes

    log(f"\n{name} sync complete. Total upserted: {total_upserted}")
    return total_upserted

def main():
    log("="*60)
    log("TakeOff Orders Sync Starting")
    log("="*60)

    # Validate credentials
    if not AMAZON_CLIENT_SECRET or not AMAZON_REFRESH_TOKEN:
        log("ERROR: Missing Amazon credentials. Check environment variables.")
        return
    if not SUPABASE_KEY:
        log("ERROR: Missing Supabase key. Check environment variables.")
        return

    access_token = get_access_token()

    grand_total = 0
    for name, marketplace_id in MARKETPLACES.items():
        grand_total += sync_marketplace(access_token, name, marketplace_id)

    log(f"\n{'='*60}")
    log(f"All marketplaces synced. Grand total upserted: {grand_total}")

    # Fetch referral fees post-sync
    fetch_referral_fees(access_token)

    log("Sync complete ✅")

if __name__ == "__main__":
    main()
