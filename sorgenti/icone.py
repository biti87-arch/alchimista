"""Genera le icone dell'app (alambicco d'ottone con liquido verde su fondo verde scuro) per Android, Windows e web."""
from PIL import Image, ImageDraw
import math, os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
BR=(204,168,96,255); LIQ=(94,190,160,255); LIQ2=(46,130,108,255)
def sfondo(n):
    im=Image.new('RGBA',(n,n)); px=im.load(); c=n/2
    for y in range(n):
        for x in range(n):
            d=min(1,math.hypot(x-c,y-c)/(n*0.72))
            a=(34,72,62); b=(14,30,26)
            px[x,y]=tuple(int(a[i]*(1-d)+b[i]*d) for i in range(3))+(255,)
    return im
def primo_piano(n,sf=True):
    S=n*4; im=Image.new('RGBA',(S,S),(0,0,0,0)); dr=ImageDraw.Draw(im); s=S/1024
    cx,cy,r=512*s,640*s,250*s
    w=int(34*s)
    # corpo del pallone e collo
    dr.ellipse([cx-r,cy-r,cx+r,cy+r],fill=BR)
    dr.rectangle([cx-80*s,190*s,cx+80*s,cy-r+60*s],fill=BR)
    dr.rounded_rectangle([cx-120*s,150*s,cx+120*s,215*s],radius=int(20*s),fill=BR)
    # interno vuoto
    ri=r-w
    dr.ellipse([cx-ri,cy-ri,cx+ri,cy+ri],fill=(0,0,0,0))
    dr.rectangle([cx-80*s+w,215*s,cx+80*s-w,cy-ri+40*s],fill=(0,0,0,0))
    # liquido (parte bassa del pallone)
    liq=Image.new('L',(S,S),0); ImageDraw.Draw(liq).ellipse([cx-ri,cy-ri,cx+ri,cy+ri],fill=255)
    cut=Image.new('L',(S,S),0); ImageDraw.Draw(cut).rectangle([0,cy-40*s,S,S],fill=255)
    from PIL import ImageChops
    m=ImageChops.multiply(liq,cut)
    col=Image.new('RGBA',(S,S),LIQ); im.paste(col,(0,0),m)
    # bolle
    for bx,by,br in [(450,560,36),(560,500,26),(520,420,18),(600,620,22)]:
        dr.ellipse([(bx-br)*s,(by-br)*s,(bx+br)*s,(by+br)*s],fill=LIQ2 if by>cy/s-40 else (0,0,0,0),outline=LIQ,width=int(10*s))
    return im.resize((n,n),Image.LANCZOS)
def icona(n,rotonda=False):
    im=sfondo(n); fg=primo_piano(n); im.alpha_composite(fg)
    if rotonda:
        m=Image.new('L',(n*4,n*4),0); ImageDraw.Draw(m).ellipse([0,0,n*4-1,n*4-1],fill=255)
        im.putalpha(m.resize((n,n),Image.LANCZOS))
    return im
def fg_adattivo(n):
    im=Image.new('RGBA',(n,n),(0,0,0,0)); f=primo_piano(int(n*0.62)); o=(n-f.size[0])//2
    im.alpha_composite(f,(o,o)); return im
def splash(w,h,scuro=False):
    im=Image.new('RGBA',(w,h),(17,21,19,255) if scuro else (237,240,235,255))
    f=primo_piano(int(min(w,h)*0.32)); im.alpha_composite(f,((w-f.size[0])//2,(h-f.size[1])//2)); return im
icona(1024).save(f'{R}/assets/icon-only.png'); fg_adattivo(1024).save(f'{R}/assets/icon-foreground.png')
sfondo(1024).save(f'{R}/assets/icon-background.png')
splash(2732,2732).save(f'{R}/assets/splash.png'); splash(2732,2732,True).save(f'{R}/assets/splash-dark.png')
icona(512).save(f'{R}/desktop/icon.png'); icona(192).save(f'{R}/www/icona.png')
res=f'{R}/android/app/src/main/res'
for d in os.listdir(res):
    p=os.path.join(res,d)
    for fn in os.listdir(p):
        fp=os.path.join(p,fn)
        if not fn.endswith('.png'): continue
        w,h=Image.open(fp).size
        if fn=='ic_launcher.png': icona(w).save(fp)
        elif fn=='ic_launcher_round.png': icona(w,True).save(fp)
        elif fn=='ic_launcher_foreground.png': fg_adattivo(w).save(fp)
        elif fn=='ic_launcher_background.png': sfondo(w).save(fp)
        elif fn=='splash.png': splash(w,h,'night' in d).save(fp)
print('ok')
