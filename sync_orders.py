git pull origin main
cp /agent/home/sync_orders.py ./
git add sync_orders.py
git commit -m "Add sync_orders.py with env var support"
git push origin main
