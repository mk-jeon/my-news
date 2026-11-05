# 로고 시안 3종 + 최종(A) 아이콘 PNG 생성. python design/make_icons.py
from PIL import Image, ImageDraw, ImageFont
BLACK, WHITE, BLUE = (10, 11, 15), (246, 247, 249), (61, 123, 255)
S = 4  # 슈퍼샘플링

def canvas(n, bg, radius):
    im = Image.new('RGBA', (n * S, n * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg: d.rounded_rectangle([0, 0, n * S - 1, n * S - 1], radius * S, fill=bg)
    return im, d

def P(pts, k, ox=0, oy=0): return [((x * k + ox) * S, (y * k + oy) * S) for x, y in pts]

M_SHAPE = [(132, 396), (132, 116), (256, 276), (380, 116), (380, 396)]  # 뒤집힌 책갈피 = M

def concept_a(n=512, bg=BLACK, radius=112, scale=1.0, mono=None):
    im, d = canvas(n, bg, radius)
    k = n / 512 * scale; o = n * (1 - scale) / 2
    d.polygon(P(M_SHAPE, k, o, o), fill=mono or BLUE)
    # 오른쪽 위 알림 점 (배경색 테두리로 분리)
    cx, cy = (380 * k + o) * S, (116 * k + o) * S
    for r, c in [(52, bg or (0, 0, 0, 0)), (36, mono or WHITE)]:
        r *= k * S; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    return im.resize((n, n), Image.LANCZOS)

def concept_b(n=512):
    im, d = canvas(n, BLUE, 112)
    d.polygon(P([(168, 84), (344, 84), (344, 428), (256, 352), (168, 428)], n / 512), fill=WHITE)
    f = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', int(64 * n / 512 * S))
    d.text((256 * n / 512 * S, 210 * n / 512 * S), 'JMK', font=f, fill=BLACK, anchor='mm')
    return im.resize((n, n), Image.LANCZOS)

def concept_c(n=512):
    im, d = canvas(n, WHITE, 112)
    k = n / 512
    for x0, y0, x1, y1, c in [(140, 120, 196, 392, BLACK), (140, 120, 372, 172, BLACK), (196, 230, 330, 282, BLUE), (140, 340, 372, 392, BLACK)]:
        d.rectangle([x0 * k * S, y0 * k * S, x1 * k * S, y1 * k * S], fill=c)
    return im.resize((n, n), Image.LANCZOS)

if __name__ == '__main__':
    out = 'docs/icons/'
    concept_a(512).save(out + 'icon-512.png')
    concept_a(192).save(out + 'icon-192.png')
    concept_a(512, radius=0, scale=0.72).save(out + 'maskable-512.png')        # 안드로이드 원형 마스크 안전영역
    concept_a(96, bg=None, radius=0, scale=1.25, mono=(255, 255, 255)).save(out + 'badge-96.png')  # 상태바 단색 배지
    # 시안 비교 시트
    sheet = Image.new('RGB', (3 * 360 + 4 * 40, 520), (18, 20, 27))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 26); g = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 18)
    for i, (fn, t, sub) in enumerate([(concept_a, 'A · M 책갈피 (채택)', 'Mark의 M = 뒤집힌 책갈피 + 알림 점'),
                                      (concept_b, 'B · JMK 리본', '책갈피 리본 위 이니셜'),
                                      (concept_c, 'C · Evans E', '신문 줄 3개로 만든 E')]):
        x = 40 + i * 400
        sheet.paste(fn(360), (x, 40), fn(360))
        d.text((x, 420), t, font=f, fill=(242, 244, 248)); d.text((x, 458), sub, font=g, fill=(152, 161, 179))
    sheet.save('design/logo-concepts.png')
    print('ok')
