import numpy as np, wave, json, re, sys
P=sys.argv[1]
def rd(p):
    w=wave.open(p); n=w.getnframes(); ch=w.getnchannels(); sr=w.getframerate(); sw=w.getsampwidth(); b=w.readframes(n)
    a=np.frombuffer(b,dtype={2:np.int16,4:np.int32}[sw]).astype(np.float64)/(2**(8*sw-1)); a=a.reshape(-1,ch).mean(1); return a,sr
def bp(a,sr):
    A=np.fft.rfft(a); f=np.fft.rfftfreq(len(a),1/sr); A[(f<2000)|(f>8000)]=0; return np.fft.irfft(A,len(a))
vo,sr=rd(f"{P}/audio/vo_m.wav"); vb=bp(vo,sr)
W=json.loads(re.search(r"VO_WORDS = (\[.*?\]);",open(f"{P}/src/vo.js").read()).group(1))
win=int(0.05*sr); rms=lambda x,i,j:np.sqrt((x[i:j]**2).mean()+1e-14)
for name in ['earshot','library']:
    sx,sr2=rd(f"{P}/audio/sfx_{name}.wav"); assert sr2==sr; sb=bp(sx,sr)
    res=[]
    for w in W:
        i0,i1=int(w['s']*sr),int(w['e']*sr); m=-99
        for j in range(i0,max(i0+1,i1-win+1),win//2):
            v=rms(vb,j,j+win); x=rms(sb,j,j+win)
            if v>1e-4: m=max(m,20*np.log10(x/v))
        res.append((round(m,1),w['w'],w['s']))
    res.sort(reverse=True); bad=[r for r in res if r[0]>-6]
    print(name,'2-8k words within 6 dB:',len(bad),bad[:8],'| top5',res[:5])
