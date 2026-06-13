import urllib.request
url = 'https://blynk.cloud/external/api/get?token=2NMuxK5u-e8X0yB7nF0Ye459GIGH21jC&V4&V1'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=15) as resp:
    print('STATUS', resp.status)
    print('HEADERS', resp.getheader('Content-Type'))
    body = resp.read().decode('utf-8', errors='replace')
    print('BODY_START')
    print(body)
    print('BODY_END')
