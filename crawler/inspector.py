import requests

url = "https://www.sharesansar.com/newsdetail/11-nic-asia-debenture-08283-delisted-from-nepse-2025-09-18"

html = requests.get(
    url,
    headers={"User-Agent":"Mozilla/5.0"}
).text

with open("article.html","w",encoding="utf-8") as f:
    f.write(html)

print("Saved article.html")