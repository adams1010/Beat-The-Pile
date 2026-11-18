"""Original backing tracks in 3 styles (house 128, trap 140 half-time with 808s, phonk 130 with cowbell), plus impact/whoosh/tap fx.
python3 audio3.py out.wav len style cuts=.. taps=.. impacts=..  (all synthesized; no samples or licensed music)"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR=44100; L=float(sys.argv[2]); STYLE=sys.argv[3]; A=dict(a.split("=") for a in sys.argv[4:])
ts=lambda k:[float(x) for x in A.get(k,"").split(",") if x]
n=int(L*SR); dr=np.zeros(n); mu=np.zeros(n); fx=np.zeros(n); rng=np.random.default_rng(hash(STYLE)%999)
def add(b,s,t,g=1.0):
    i=int(t*SR); j=min(n,i+len(s))
    if 0<=i<n: b[i:j]+=g*s[:j-i]
T=lambda d:np.linspace(0,d,int(d*SR),False)
E_=lambda d,r:np.exp(-T(d)/r)
def bp(x,lo,hi): b,a=butter(2,[lo/(SR/2),min(hi,20000)/(SR/2)],"band"); return lfilter(b,a,x)
def lp(x,f): b,a=butter(2,f/(SR/2)); return lfilter(b,a,x)
hz=lambda m:440*2**((m-69)/12)
def kick(p=1):
    d=.32;t=T(d);f=45+150*np.exp(-t*35); s=np.sin(2*np.pi*np.cumsum(f)/SR)*E_(d,.09*p); s[:220]+=bp(rng.standard_normal(220),2000,9000)*.5; return np.tanh(s*1.8)
def snare(): d=.25; return (bp(rng.standard_normal(int(d*SR)),1200,6000)*E_(d,.07)+0.4*np.sin(2*np.pi*190*T(d))*E_(d,.05))
def hat(o=False): d=.18 if o else .05; return bp(rng.standard_normal(int(d*SR)),8000,16000)*E_(d,.06 if o else .012)
def saw(f,d): t=T(d); return sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,8))
def b808(m,d,glide=None):
    t=T(d); f=hz(m)*np.ones_like(t)
    if glide: f=hz(m)+(hz(glide)-hz(m))*np.minimum(1,t/.12)
    return np.tanh(2.2*np.sin(2*np.pi*np.cumsum(f)/SR))*np.minimum(1,t/.005)*E_(d,d*.7)
def bell(m,d): t=T(d); return (np.sign(np.sin(2*np.pi*hz(m)*t))*.5+np.sin(2*np.pi*hz(m)*1.5*t)*.5)*E_(d,.12)
if STYLE=="house":
    B=60/128; CH=[[69,72,76],[65,69,72],[60,64,67],[67,71,74]]; BS=[45,41,48,43]
    for b in range(int(L/(4*B))+1):
        t0=b*4*B
        for k in range(4):
            tb=t0+k*B; add(dr,kick(),tb,1)
            if k in(1,3): add(dr,snare(),tb,.45)
            add(dr,hat(True),tb+B/2,.25); add(dr,hat(),tb+B/4,.1); add(dr,hat(),tb+3*B/4,.1)
            add(mu,lp(saw(hz(BS[b%4]),B/2)*E_(B/2,.12),900),tb+B/2,.32)
            add(mu,lp(sum(saw(hz(m),B*.45) for m in CH[b%4])/3*E_(B*.45,.09),3500),tb+B/2,.18)
        for k in range(16): add(mu,np.sin(2*np.pi*hz(CH[b%4][k%3]+12)*T(B/4))*E_(B/4,.04),t0+k*B/4,.1)
elif STYLE=="trap":
    B=60/140; BS=[(45,None),(45,48),(41,None),(43,40)]; CH=[[57,60,64],[57,60,64],[53,57,60],[55,59,62]]
    for b in range(int(L/(4*B))+1):
        t0=b*4*B
        add(dr,kick(1.4),t0,1); add(dr,kick(1.4),t0+2.5*B,.9); add(dr,snare(),t0+2*B,.6)
        for k in range(8):
            add(dr,hat(),t0+k*B/2,.16)
            if (b%2==1 and k in(5,6,7)):
                for r in range(3): add(dr,hat(),t0+k*B/2+r*B/6,.12)
        m,g=BS[b%4]; add(mu,b808(m,2*B,g),t0,.55); add(mu,b808(m,1.2*B),t0+2.5*B,.45)
        add(mu,lp(sum(np.sin(2*np.pi*hz(x+12)*T(4*B)) for x in CH[b%4])/3*np.minimum(1,T(4*B)/.3)*np.minimum(1,(4*B-T(4*B))/.3),2500),t0,.12)
        for k,mm in enumerate([76,72,69,72,76,79,76,72]): add(mu,np.sin(2*np.pi*hz(mm)*T(B/2))*E_(B/2,.12),t0+k*B/2,.07)
else: # phonk
    B=60/130; BS=[38,38,41,36]; BELL=[74,74,77,74,72,74,70,72]
    for b in range(int(L/(4*B))+1):
        t0=b*4*B
        for k in range(4):
            tb=t0+k*B; add(dr,kick(1.2),tb,.95 if k in(0,2) else .0)
            if k in(1,3): add(dr,snare(),tb,.55)
            add(dr,hat(),tb+B/2,.15); add(dr,hat(),tb,.08)
        add(mu,b808(BS[b%4],4*B*.9),t0,.5)
        for k,m in enumerate(BELL): add(mu,bell(m+(0 if b%2==0 else -2),B/2),t0+k*B/2,.2)
ph=(np.arange(n)/SR)%B; mu*=0.4+0.6*np.minimum(1,ph/(B*.5))
def whoosh():
    d=.4;x=rng.standard_normal(int(d*SR));out=np.zeros_like(x)
    for i in range(0,len(x),441):
        f=400+7000*(i/len(x)); seg=bp(x[max(0,i-441):i+882],f,f*1.7)[(441 if i else 0):][:len(out[i:i+441])]; out[i:i+len(seg)]=seg
    return out*np.sin(np.pi*T(d)/d)**2
def impact(): d=1.2;t=T(d); return np.tanh((np.sin(2*np.pi*np.cumsum(40+120*np.exp(-t*12))/SR)*E_(d,.35)+bp(rng.standard_normal(len(t)),3000,15000)*E_(d,.3)*.6)*1.6)
def tap(): return np.sin(2*np.pi*1900*T(.05))*E_(.05,.008)
for c in ts("cuts"): add(fx,whoosh(),max(0,c-.28),.5)
for c in ts("taps"): add(fx,tap(),c,.8)
for c in ts("impacts"): add(fx,impact(),c,1.0)
mix=dr*.9+mu+fx; f=int(.6*SR); mix[-f:]*=np.linspace(1,0,f)
mix=np.tanh(mix/np.abs(mix).max()*1.6)*.92
wavfile.write(sys.argv[1],SR,(np.stack([mix,mix],1)*32767).astype(np.int16))
