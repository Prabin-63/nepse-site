import requests
from bs4 import BeautifulSoup

url = "https://www.sharesansar.com/category/nepse-news"

response = requests.get(
    url,
    headers={"User-Agent": "Mozilla/5.0"}
)

soup = BeautifulSoup(response.text, "html.parser")

for a in soup.find_all("a", href=True):
    text = a.get_text(strip=True)

    if "next" in text.lower():
        print("TEXT:", text)
        print("URL :", a["href"])