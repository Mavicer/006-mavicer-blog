"""Render the announcement demo on one shared layout grid (Pillow + ffmpeg)."""
import math, os, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SECONDS = 960, 640, 60, 8
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
def feature_scene(kind):
    im=FIRST.copy(); d=ImageDraw.Draw(im)
    rounded(d,(84,124,876,570),'#fafbfc',12)
    if kind=='search':
        text(d,(92,147),'搜索赛事',28)
        rounded(d,(92,183,868,229),'#eceef2',10)
        text(d,(112,206),'网络安全',20)
        card(d,255,'TryHackMe 网络安全赛','CTF  ·  线上')
        card(d,369,'香港网安夺旗赛','CTF  ·  线上初赛')
    elif kind=='detail':
        text(d,(92,147),'MoonBit 黑客松',28)
        for y,label,value in [(215,'参与方式','线上'),(270,'参赛要求','查看组队与提交要求'),(325,'作品提交','源代码、文档与演示')]:
            text(d,(92,y),label,18,MUTED);text(d,(300,y),value,18)
            d.line((92,y+25,868,y+25),fill='#e7e8ec')
        rounded(d,(92,400,450,452),'#eceef2',12);text(d,(271,426),'官方来源 ↗',18,INK,'mm')
        rounded(d,(470,400,868,452),WINE,12);text(d,(669,426),'收藏赛事',18,'white','mm')
    elif kind=='calendar':
        text(d,(92,147),'赛事日历',28)
        text(d,(868,147),'报名与比赛节点','18' if False else 18,MUTED,'rm')
        for i in range(7):
            x=92+i*111
            text(d,(x+50,207),str(9+i),18,INK,'mm')
            rounded(d,(x,235,x+100,516),'#f0f1f4',10)
        for x,y,label in [(203,258,'报名截止'),(425,331,'比赛开始'),(647,406,'作品提交')]:
            rounded(d,(x+4,y,x+96,y+60),'#f5e6eb',8);text(d,(x+50,y+30),label,16,WINE,'mm')
    else:
        text(d,(92,147),'我的收藏',28)
        card(d,205,'MoonBit 黑客松','黑客松  ·  线上',True,True)
        text(d,(92,350),'保存感兴趣的赛事，稍后继续查看。',18,MUTED)
    return im
SEARCH=feature_scene('search');DETAIL=feature_scene('detail');CALENDAR=feature_scene('calendar');BOOKMARKS=feature_scene('saved')
def frame(t):
    scenes=[SEARCH,FILTERED,DETAIL,CALENDAR,BOOKMARKS]
    starts=[0,1.35,2.7,4.05,5.4]
    if t>=6.7:return blend(BOOKMARKS,SEARCH,(t-6.7)/1.0).convert('RGB')
    index=max(i for i,start in enumerate(starts) if t>=start)
    im=scenes[index]
    if index and t<starts[index]+.18:im=blend(scenes[index-1],im,(t-starts[index])/.18)
    return im.convert('RGB')
FIRST=SEARCH

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
for (x,y),t in zip([(0,0),(W,0),(0,H),(W,H)],[0,2,3.5,5]):proof.paste(frame(t),(x,y))
if os.environ.get('NEXUS_VIDEO_PROOF'): proof.save(os.environ['NEXUS_VIDEO_PROOF'],quality=92)
print(f'{W}x{H}, {FPS}fps, {SECONDS}s; loop endpoints identical: {frame(0).tobytes()==frame(7.99).tobytes()}; bytes: {(OUT/"nexus-intro.mp4").stat().st_size}')
