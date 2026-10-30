"""Render the announcement demo on one shared layout grid (Pillow + ffmpeg)."""
import math, os, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SECONDS = 960, 640, 60, 10
OUT = Path(__file__).resolve().parents[1] / 'public/media'
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
FONTS = {n: ImageFont.truetype(FONT, n) for n in [14, 16, 18, 20, 22, 28]}
INK, MUTED, WINE = '#30343b', '#777d86', '#a31f34'

def smooth(v):
    v = max(0, min(1, v))
    return v * v * (3 - 2 * v)

def text(draw, xy, value, size=18, fill=INK, anchor='lm'):
    draw.text(xy, value, font=FONTS[size], fill=fill, anchor=anchor)

def rounded(draw, box, fill, radius=12, outline=None):
    draw.rounded_rectangle(box, radius, fill=fill, outline=outline, width=1)

base = Image.new('RGB', (W,H), '#eef1f5')
glow = Image.new('RGBA',(W,H)); d = ImageDraw.Draw(glow)
d.ellipse((400,-250,1100,380), fill=(179,85,111,28))
d.ellipse((-200,280,500,900), fill=(90,143,161,30))
base = Image.alpha_composite(base.convert('RGBA'), glow.filter(ImageFilter.GaussianBlur(100)))
shadow = Image.new('RGBA',(W,H)); d=ImageDraw.Draw(shadow)
rounded(d,(67,52,893,601),(36,43,59,22),28)
base = Image.alpha_composite(base,shadow.filter(ImageFilter.GaussianBlur(18)))

def card(draw, y, title, kind, selected=False, saved=False):
    rounded(draw,(92,y,868,y+98),'#ffffff',14,'#e9e9ed')
    rounded(draw,(110,y+17,118,y+81),WINE if selected else '#e6e8ed',4)
    text(draw,(136,y+32),title,20)
    text(draw,(136,y+66),kind,16,MUTED)
    if saved:
        rounded(draw,(742,y+33,846,y+67),'#f7e9ed',9)
        text(draw,(794,y+50),'已收藏',16,WINE,'mm')
    else:
        text(draw,(838,y+50),'查看  ↗',16,MUTED,'rm')

def scene(active=False, saved=False):
    im=base.copy(); d=ImageDraw.Draw(im)
    rounded(d,(64,40,896,592),'#fafbfc',26,'#ffffff')
    rounded(d,(92,62,124,94),WINE,8);text(d,(108,78),'N',20,'#ffffff','mm')
    text(d,(137,78),'Nexus',22)
    text(d,(868,78),'计算机赛事',16,MUTED,'rm')
    d.line((92,111,868,111),fill='#e7e8ec')
    text(d,(92,147),'赛事',28)
    # Every chip shares the same vertical centre and inset.
    for x,label,width,on in [(92,'全部',78,False),(180,'线上',78,active),(268,'黑客松',100,False)]:
        rounded(d,(x,180,x+width,216),'#f5e6eb' if on else '#eceef2',10)
        text(d,(x+width/2,198),label,16,WINE if on else MUTED,'mm')
    text(d,(868,198),'线上优先',14,MUTED,'rm')
    card(d,238,'MoonBit 黑客松','黑客松  ·  线上',active,saved)
    card(d,350,'Qoder 高校创造力大赛','开发挑战  ·  线上')
    card(d,462,'TryHackMe 网络安全赛','CTF  ·  线上')
    return im

FIRST=scene()
FILTERED=scene(True)
SAVED=scene(True,True)

def blend(a,b,p): return Image.blend(a,b,smooth(p))
def frame(t):
    if t<1.4: im=FIRST.copy()
    elif t<2.0: im=blend(FIRST,FILTERED,(t-1.4)/.6)
    elif t<4.8: im=FILTERED.copy()
    elif t<5.2: im=blend(FILTERED,SAVED,(t-4.8)/.4)
    elif t<7.8: im=SAVED.copy()
    elif t<9.2: im=blend(SAVED,FIRST,(t-7.8)/1.4)
    else: im=FIRST.copy()
    # A smooth pointer supplies motion without moving text or cards.
    if .3<t<6.7:
        if t<1.4:
            p=smooth((t-.3)/1.1); x,y=630+(219-630)*p,390+(202-390)*p
        elif t<2.6:x,y=219,202
        elif t<4.8:
            p=smooth((t-2.6)/2.2);x,y=219+(806-219)*p,202+(288-202)*p
        else:x,y=806,288
        alpha=smooth((t-.3)/.3)*smooth((6.7-t)/.5)
        cursor=Image.new('RGBA',(W,H));cd=ImageDraw.Draw(cursor)
        cd.polygon([(x,y),(x+3,y+24),(x+9,y+18),(x+16,y+28),(x+21,y+25),(x+14,y+15),(x+23,y+13)],fill=(40,43,49,int(230*alpha)),outline=(255,255,255,int(255*alpha)))
        for moment in [1.5,4.9]:
            p=(t-moment)/.55
            if 0<p<1:
                radius=10+22*p;cd.ellipse((x-radius,y-radius,x+radius,y+radius),outline=(163,31,52,int(120*(1-p))),width=2)
        im=Image.alpha_composite(im,cursor)
    return im.convert('RGB')

OUT.mkdir(exist_ok=True)
FIRST.convert('RGB').save(OUT/'nexus-intro-poster.jpg',quality=94,subsampling=0)
ffmpeg=os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
process=subprocess.Popen([ffmpeg,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','slow','-crf','19','-pix_fmt','yuv420p','-profile:v','main','-level','3.2','-g','120','-movflags','+faststart',str(OUT/'nexus-intro.mp4')],stdin=subprocess.PIPE)
for i in range(FPS*SECONDS): process.stdin.write(frame(i/FPS).tobytes())
process.stdin.close()
if process.wait(): raise RuntimeError('ffmpeg failed')
# Contact sheet makes the layout and the exact loop endpoints reviewable.
proof=Image.new('RGB',(W*2,H*2),'white')
for (x,y),t in zip([(0,0),(W,0),(0,H),(W,H)],[0,2.6,6.4,9.99]):proof.paste(frame(t),(x,y))
if os.environ.get('NEXUS_VIDEO_PROOF'): proof.save(os.environ['NEXUS_VIDEO_PROOF'],quality=92)
print(f'{W}x{H}, {FPS}fps, {SECONDS}s; loop endpoints identical: {frame(0).tobytes()==frame(9.99).tobytes()}; bytes: {(OUT/"nexus-intro.mp4").stat().st_size}')
