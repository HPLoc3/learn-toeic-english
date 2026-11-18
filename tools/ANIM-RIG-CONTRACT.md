# Hop dong BSRig.register(kind, name, spec) - goi A (engine+rig) <-> goi B (cast + du lieu)

Tat ca duoi day la hop dong. B dang ky trong assets/js/anim-cast.js (nap SAU anim-rig.js). Ten: /^[a-z][a-z0-9]{0,15}$/.
Chuoi SVG trong spec la MA TINH cua kho (khong chua chuoi cua du lieu unit). Cam: script, image, href, on*=, foreignObject, thuoc tinh id.
Muon dat ten cho phan tu can dieu khien/ghi: dung `data-r="~ten"`; rig doi `~` thanh `<idDoiTuong>.` (vd data-r="~water" -> data-r="cup.water").
Toa do: san khau (stage) mac dinh 360x270, goc tren-trai, y xuong.

## kind = "actor"
```
BSRig.register("actor","nam",{
  name:"Nam", age:28, job:"nhan vien quan ca phe",      // bat buoc (test kiem)
  body:'<path .../>',      // than (khong chan, khong dau, khong tay). x=0 la giua than, y TUYET DOI nhu san khau (chan o y~250).
  head:'<ellipse .../>',   // dau + toc (khong mat, khong mieng). Xoay quanh pivot khi headTilt.
  pivot:[0,98],            // tam xoay dau
  hip:[0,205],             // tam nghieng than (lean)
  eye:{L:[-7,78],R:[7,78],r:2.3,c:"#1b1b1b"},   // rig tu ve 2 cham mat (data-r id.eyeL / id.eyeR); kenh look dich chung
  faces:{smile:'<path .../>', neutral:'...'},   // bien the mieng (trong nhom dau); cast.face / kenh face chon; it nhat 1 khoa
  outfit:{apron:'<path .../>'},                 // lop trang phuc tuy chon, ve sau body truoc head; chi lop co trong cast[id].outfit moi duoc ve
  arm:{L:33, s:[13,110], rest:[26,160], w:9, c:"#4f7cac", hr:5.5, hc:"#f0b98d"},
        // L = do dai MOI doan tay (IK 2 doan); vai trai (-s0,s1), phai (+s0,s1); tay nghi (-rest0,rest1),(+rest0,rest1) (toa do cuc bo dien vien)
        // w,c = net tay (tay ao); hr,hc = ban tay tron
  leg:{L:20, hip:[7,205], foot:[7,244], w:10, c:"#3d405b", shoe:{rx:9,ry:3.5,c:"#222",dx:4,dy:4}, sit:{dy:22,fx:26}},
        // chan: 2 net IK (side=+1: goi ve phia truoc). foot = ban chan khi dung.
        // sit (0..1): than ha xuong sit*dy, chan duoi ra truoc sit*fx va van cham dat.
  anchors:{ eye:[6,80], apron:[0,151,46,94] },  // neo cuc bo [x,y] (hoac [x,y,w,h] cho ring: tam + kich thuoc). Dung boi tay "@man.eye", fx.
  headAnchors:["eye"]                           // (tuy chon) neo xoay theo dau (headTilt + look)
});
```
Kenh dien vien (engine cap): x, lean(do), headTilt(do), look([dx,dy] px, kep +-4; khong co track thi tu suy tu headTilt: dx=1.6*c(tilt/10), dy=1.8*c(tilt/10)),
handL, handR ("rest" | [dx,dy] tuong doi voi vi tri tay nghi, he truc dien vien (co flip) | "@doituong.neo" toa do san khau),
face (chuoi khoa cua faces; doi tai moc key), sit (0..1), flip (0/1, >0.5 thi lat).
Lop ve cua mot dien vien: nhom `id` (translate x,y + scale flip) chua [chan, nhom `id.up` (rotate lean) chua body, outfit, nhom `id.head` (rotate tilt) chua head + mat + faces];
tay (`id.armL/armR` path) o lop tren tat ca than; ban tay (`id.handL/handR` circle) tren dao cu front.

## kind = "prop"
```
BSRig.register("prop","cup",{
  z:"back",                         // mac dinh "back"|"front" (du lieu props[id].z ghi de)
  svg:'<g>...<rect data-r="~water" x="-9" y="-1" width="18" height="0.01"/>...</g>',   // toa do CUC BO, goc (0,0)=vi tri x,y cua du lieu; rig boc trong <g transform="translate(x,y) rotate(rot)">
  params:{ fill:{def:0, bind:[["water","height",0.01,16],["water","y",-1,-17]]} },
        // kenh tham so rieng. bind: [tenPhan,thuocTinh,v0,v1] => attr = v0+(v1-v0)*v.
  anchors:{ handle:[0,0], spout:[46,-16], surface:function(p){ return [0,-1-16*p.fill]; }, rim:[0,-20] }
        // neo cuc bo: mang [x,y] hoac ham (p)=>[x,y], p = gia tri hien tai cac params. Rig tu xoay theo rot va tinh tien theo x,y.
});
```
Kenh dao cu: x, y, rot(do, quanh goc cuc bo), opacity + cac khoa trong params.

## kind = "backdrop"
```
BSRig.register("backdrop","kitchen",{ svg:'<rect width="360" height="270" fill="#eef3fa"/>...' });  // ve duoi cung, toa do san khau
```

## kind = "fx"  (rig co san: stream, gaze, ring; B co the them)
```
spec = { shape:"line"|"ring", refs:["from","to"] | ["around"], style:"stroke:var(--pri,#0a58ca)",
         w:2.5, dash:"5 5", flow:30 (toc do dashoffset theo giay cuc bo), drop:1 (diem cuoi roi thang: x cuoi = x dau), pad:0 }
```
Kenh hieu ung: on (0..1, nhan opacity), opacity; tuy chon o du lieu `pulse:{hz,depth}` => opacity *= (1-depth)+depth*sin(2*pi*hz*lt) (lt = giay cuc bo cua canh).

## Dang ky + dung
- Xep lop: phong, dao cu back, than dien vien, tay, dao cu front, ban tay, hieu ung.
- Du lieu cast[id]={actor,x,outfit:[...],face,flip?}; props[id]={type,x,y,z?}; fx[id]={type,from,to|around,pulse?}. id: /^[a-z][A-Za-z0-9]{0,15}$/, duy nhat qua 3 nhom.
- Neo tham chieu "id.ten". Tay co the ghim "@kettle.handle".
- API cong khai cua rig: register, has(kind,name), spec(kind,name), solveArm(s,h,L,side), markup(def), bind(def,root), apply(ctx,sample), anchor(def,id,name,sample).
- Luat key track: [t_cuc_bo, gia_tri, ease?]; ease danh cho doan DEN key do: "ease"(smoothstep)|"step"(giu gia tri truoc, nhay tai moc)|"linear"(mac dinh). Key dau la "step" => truoc moc gia tri 0. Giua hai canh KHAC NHAU giu nguyen (khong noi suy) => moi canh nen mo dau bang key gia tri hien co. Truoc key dau: giu gia tri key dau. rest phai < dur.
