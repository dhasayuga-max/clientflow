export const CANVAS_W = 960;
export const CANVAS_H = 540;

export const BRAND = {
  orange: '#E8762C',
  orangeDark: '#C25E1E',
  yellow: '#F2B632',
  white: '#FFFFFF',
  cream: '#FFF8F0',
  cardBg: '#FFF3E8',
  cardBorder: '#EAD9C8',
  textDark: '#2B2118',
  textMuted: '#6B5D4F',
};

export interface SlideObject {
  type: string;
  [key: string]: unknown;
}

export interface SlideDefinition {
  id: string;
  name: string;
  background: string;
  objects: SlideObject[];
}

function r(o: {left:number;top:number;width:number;height:number;fill?:string;stroke?:string;strokeWidth?:number;rx?:number;ry?:number;opacity?:number}): SlideObject {
  return { type:'rect', ...o, fill:o.fill||'transparent', stroke:o.stroke||'transparent', strokeWidth:o.strokeWidth||0, rx:o.rx||0, ry:o.ry||0, opacity:o.opacity??1 };
}
function t(content:string, o:{left:number;top:number;width?:number;fontSize?:number;fontWeight?:string;fill?:string;fontFamily?:string;textAlign?:string;lineHeight?:number;fontStyle?:string;charSpacing?:number}): SlideObject {
  return { type:'textbox', text:content, ...o, width:o.width||300, fontSize:o.fontSize||14, fontWeight:o.fontWeight||'normal', fill:o.fill||BRAND.textDark, fontFamily:o.fontFamily||'Arial', textAlign:o.textAlign||'left', lineHeight:o.lineHeight||1.3, charSpacing:o.charSpacing||0 };
}
function ln(x1:number,y1:number,x2:number,y2:number,color:string,w=1,opacity=0.35): SlideObject {
  return { type:'line', x1,y1,x2,y2, left:Math.min(x1,x2), top:Math.min(y1,y2), stroke:color, strokeWidth:w, opacity };
}
function hex(cx:number,cy:number,rad:number,strokeColor:string,strokeW=4): SlideObject {
  const pts=[];
  for(let i=0;i<6;i++){const a=(Math.PI/180)*(60*i-30);pts.push({x:cx+rad*Math.cos(a),y:cy+rad*Math.sin(a)});}
  return { type:'polygon', left:cx-rad, top:cy-rad, width:rad*2, height:rad*2, points:pts.map(p=>({x:p.x-(cx-rad),y:p.y-(cy-rad)})), fill:'transparent', stroke:strokeColor, strokeWidth:strokeW };
}

function slide1(): SlideDefinition {
  return { id:'slide-1', name:'Cover', background:BRAND.orange, objects:[
    ln(55,42,905,42,BRAND.white),
    ln(55,498,905,498,BRAND.white),
    hex(15,270,52,BRAND.yellow,4),
    t('Social Media Production\n& Meta Ads Proposal\nfor Shanthi Ayurvedas',{left:72,top:148,width:700,fontSize:32,fontWeight:'bold',fill:BRAND.white,lineHeight:1.25}),
    t('by',{left:72,top:380,fontSize:14,fill:'#FFE8D6',width:25}),
    t('propelbees.com',{left:100,top:380,fontSize:14,fontWeight:'bold',fill:BRAND.white,width:200}),
  ]};
}

function slide2(): SlideDefinition {
  return { id:'slide-2', name:'Project Objective', background:BRAND.white, objects:[
    t('Project Objective',{left:48,top:36,fontSize:22,fontWeight:'bold',fill:BRAND.textDark,width:600}),
    r({left:48,top:82,width:CANVAS_W-96,height:118,fill:BRAND.cream,rx:8,ry:8}),
    t('To produce high-quality Instagram Reels that showcase Shanthi Ayurvedas, craftsmanship, and brand value while improving reach and engagement across social media platforms.',{left:72,top:98,width:CANVAS_W-144,fontSize:14,fill:BRAND.textDark,lineHeight:1.4}),
    r({left:48,top:218,width:418,height:68,fill:BRAND.white,stroke:BRAND.cardBorder,strokeWidth:1,rx:6,ry:6}),
    t('OUR PORTFOLIO',{left:66,top:230,fontSize:9,fontWeight:'bold',fill:BRAND.textMuted,charSpacing:80}),
    t('behance.net/whiteberrys',{left:66,top:248,fontSize:14,fontWeight:'bold',fill:BRAND.orange}),
    r({left:494,top:218,width:418,height:68,fill:BRAND.white,stroke:BRAND.cardBorder,strokeWidth:1,rx:6,ry:6}),
    t('OUR OFFICIAL WEBSITE',{left:512,top:230,fontSize:9,fontWeight:'bold',fill:BRAND.textMuted,charSpacing:80}),
    t('propelbees.com',{left:512,top:248,fontSize:14,fontWeight:'bold',fill:BRAND.orange}),
    t('02',{left:890,top:510,fontSize:10,fill:BRAND.textMuted,textAlign:'right'}),
  ]};
}

function slide3(): SlideDefinition {
  const cw=(CANVAS_W-96-12)/2, ch=136, sx=48, sy=140, gy=8;
  function card(col:number,row:number,num:string,title:string,bullets:string[]): SlideObject[] {
    const x=sx+col*(cw+12), y=sy+row*(ch+gy);
    return [
      r({left:x,top:y,width:cw,height:ch,fill:BRAND.cardBg,stroke:BRAND.cardBorder,strokeWidth:1,rx:7,ry:7}),
      r({left:x+14,top:y+13,width:30,height:30,fill:BRAND.orange,rx:15,ry:15}),
      t(num,{left:x+14,top:y+17,width:30,fontSize:13,fontWeight:'bold',fill:BRAND.white,textAlign:'center'}),
      t(title,{left:x+56,top:y+16,width:cw-70,fontSize:11.5,fontWeight:'bold',fill:BRAND.textDark}),
      t(bullets.map(b=>`- ${b}`).join('\n'),{left:x+16,top:y+55,width:cw-28,fontSize:9.5,fill:BRAND.textMuted,lineHeight:1.4}),
    ];
  }
  const inc=['Content planning','Script & concept','Professional shooting','Video editing','Optimized delivery'];
  const sw=(CANVAS_W-96)/inc.length;
  return { id:'slide-3', name:'Video Package', background:BRAND.white, objects:[
    t('Monthly Video Package — Shanthi Ayurvedas',{left:48,top:22,fontSize:18,fontWeight:'bold',fill:BRAND.textDark,width:CANVAS_W-96}),
    r({left:48,top:60,width:CANVAS_W-96,height:56,fill:BRAND.orange,rx:7,ry:7}),
    t('12 Videos / Month',{left:66,top:74,fontSize:15,fontWeight:'bold',fill:BRAND.white}),
    t('Rs.57,000',{left:CANVAS_W-230,top:70,fontSize:20,fontWeight:'bold',fill:BRAND.white}),
    t('Monthly',{left:CANVAS_W-230,top:92,fontSize:11,fill:'#FFE8D6',width:200}),
    ...card(0,0,'1','Artist Team Videos',['Creative cinematic product showcase','Professional lighting and storytelling','Focus on tile designs and aesthetic appeal']),
    ...card(1,0,'2','Site Videos (Work Process)',['Real footage','Behind-the-scenes work process','Builds customer trust and authenticity']),
    ...card(0,1,'3','Trending Videos',['Social media trend-based content','Designed to increase reach and engagement']),
    ...card(1,1,'4','Presenter Videos',['Presenter explaining products','Customer content','Product highlighting videos']),
    r({left:48,top:sy+2*ch+gy+12,width:CANVAS_W-96,height:34,fill:BRAND.cream,rx:5,ry:5}),
    ...inc.map((t2,i)=>t(`+ ${t2}`,{left:48+i*sw+4,top:sy+2*ch+gy+21,width:sw-8,fontSize:9,fill:BRAND.textDark,textAlign:'center'})),
    t('03',{left:890,top:510,fontSize:10,fill:BRAND.textMuted}),
  ]};
}

function slide4(): SlideDefinition {
  const svcs=[
    {name:'Initial Consultation',bullets:['Understand client goals','Review existing marketing efforts']},
    {name:'Ad Creation & Optimization',bullets:['Ad copy & creative optimization','Landing page optimization','Ad formats']},
    {name:'Campaign Structure & Strategy',bullets:['Campaign objectives','Ad sets & targeting','Budget & scheduling']},
    {name:'Account Setup & Optimization',bullets:['Meta Business Account setup','Ad account configuration']},
    {name:'Tracking & Analytics',bullets:['Pixel & conversion tracking','Link Meta Ads and Analytics','Monitor key metrics']},
    {name:'Campaign Management',bullets:['Budget management & bidding','Ad placement & optimization','Ongoing management','Reporting & analysis','Client communication']},
  ];
  const cols=3, cw=(CANVAS_W-96-2*10)/3, ch=128, sy=94;
  const cards: SlideObject[]=[];
  svcs.forEach((svc,i)=>{
    const col=i%cols, row=Math.floor(i/cols), x=48+col*(cw+10), y=sy+row*(ch+10);
    cards.push(
      r({left:x,top:y,width:cw,height:ch,fill:BRAND.cardBg,stroke:BRAND.cardBorder,strokeWidth:1,rx:6,ry:6}),
      r({left:x+12,top:y+12,width:26,height:26,fill:BRAND.white,stroke:BRAND.orange,strokeWidth:1.25,rx:13,ry:13}),
      t(String(i+1),{left:x+12,top:y+14,width:26,fontSize:9,fontWeight:'bold',fill:BRAND.orange,textAlign:'center'}),
      t(svc.name,{left:x+10,top:y+44,width:cw-20,fontSize:10,fontWeight:'bold',fill:BRAND.textDark}),
      t(svc.bullets.map(b=>`- ${b}`).join('\n'),{left:x+10,top:y+62,width:cw-20,fontSize:8.5,fill:BRAND.textMuted,lineHeight:1.3}),
    );
  });
  const bY=sy+2*ch+10+10;
  return { id:'slide-4', name:'Meta Ads Services', background:BRAND.white, objects:[
    t('Our Core Services & Charges (Meta Ads)',{left:48,top:18,fontSize:18,fontWeight:'bold',fill:BRAND.textDark,width:CANVAS_W-96}),
    t('Meta & Google Ads Management Services',{left:48,top:46,fontSize:11,fill:BRAND.textMuted}),
    ...cards,
    r({left:48,top:bY,width:CANVAS_W-96,height:62,fill:BRAND.orange,rx:7,ry:7}),
    t('Monthly charges',{left:64,top:bY+20,fontSize:12,fontWeight:'bold',fill:BRAND.white}),
    ln(240,bY+10,240,bY+52,BRAND.white,1,0.4),
    t('Below Rs.30,000 monthly ad spend',{left:252,top:bY+10,fontSize:9,fill:'#FFE8D6',width:270}),
    t('Rs.10,000 / month',{left:252,top:bY+26,fontSize:14,fontWeight:'bold',fill:BRAND.white}),
    ln(538,bY+10,538,bY+52,BRAND.white,1,0.4),
    t('Above Rs.30,000 monthly ad spend',{left:550,top:bY+10,fontSize:9,fill:'#FFE8D6',width:270}),
    t('20% of monthly spend',{left:550,top:bY+26,fontSize:14,fontWeight:'bold',fill:BRAND.white}),
    t('04',{left:890,top:510,fontSize:10,fill:BRAND.textMuted}),
  ]};
}

function slide5(): SlideDefinition {
  const eq=[
    {name:'Sony A7M4',desc:'Professional mirrorless camera'},
    {name:'Godox LC500',desc:'LED lighting system'},
    {name:'Nanlite BI 300',desc:'Studio lighting (used when required)'},
    {name:'Professional Focus Lights',desc:'For precise, polished cinematic shots'},
  ];
  const cw=(CANVAS_W-96-3*12)/4, ch=220;
  return { id:'slide-5', name:'Equipment', background:BRAND.white, objects:[
    t('Production Equipment',{left:48,top:36,fontSize:22,fontWeight:'bold',fill:BRAND.textDark}),
    ...eq.flatMap((e,i)=>{
      const x=48+i*(cw+12), y=90;
      return [
        r({left:x,top:y,width:cw,height:ch,fill:BRAND.cardBg,stroke:BRAND.cardBorder,strokeWidth:1,rx:8,ry:8}),
        r({left:x+(cw-52)/2,top:y+26,width:52,height:52,fill:BRAND.orange,rx:26,ry:26}),
        t('📷',{left:x+(cw-52)/2,top:y+32,width:52,fontSize:22,textAlign:'center',fill:BRAND.white}),
        t(e.name,{left:x+8,top:y+102,width:cw-16,fontSize:12,fontWeight:'bold',fill:BRAND.textDark,textAlign:'center'}),
        t(e.desc,{left:x+10,top:y+128,width:cw-20,fontSize:9.5,fill:BRAND.textMuted,textAlign:'center',lineHeight:1.35}),
      ];
    }),
    t('05',{left:890,top:510,fontSize:10,fill:BRAND.textMuted}),
  ]};
}

function slide6(): SlideDefinition {
  const cases=[
    {name:'Naatus India',url:'propelbees.com/case-study/naatusakkarai-casestudy/'},
    {name:'Pandian Ecoxpods',url:'propelbees.com/case-study/pandianecoxpods-casestudy/'},
    {name:'GB Pack',url:'propelbees.com/case-study/gbpack-casestudy/'},
    {name:'Charu Multispeciality',url:'propelbees.com/case-study/charudental-casestudy/'},
  ];
  const cw=(CANVAS_W-96-3*12)/4;
  return { id:'slide-6', name:'Case Studies', background:BRAND.white, objects:[
    t('Our Recent Case Studies',{left:48,top:36,fontSize:22,fontWeight:'bold',fill:BRAND.textDark}),
    ...cases.flatMap((c,i)=>{
      const x=48+i*(cw+12);
      return [
        r({left:x,top:96,width:cw,height:68,fill:BRAND.cardBg,stroke:BRAND.cardBorder,strokeWidth:1,rx:6,ry:6}),
        t(c.name,{left:x+12,top:108,width:cw-24,fontSize:11,fontWeight:'bold',fill:BRAND.textDark}),
        t(c.url,{left:x+12,top:130,width:cw-24,fontSize:8,fill:BRAND.orange}),
      ];
    }),
    t('06',{left:890,top:510,fontSize:10,fill:BRAND.textMuted}),
  ]};
}

function slide7(): SlideDefinition {
  const brands=['Naalu Sakkarai','Eco Pods','GB Pack','Steeris',"Dr. Charu's",'MSM Holidays','Exoticamp','Sri Srinivasa Maruthuvar',"Jyothi's",'The Sheriff Dental','Tiny Bee'];
  const digital=['Ecartu','Ecartu Billing','Whiteberry Ads'];
  const perRow=5, bw=(CANVAS_W-96-(perRow-1)*8)/perRow, bh=36;
  return { id:'slide-7', name:'Brands', background:BRAND.white, objects:[
    t('Brands We Collaborate With',{left:48,top:22,fontSize:20,fontWeight:'bold',fill:BRAND.textDark}),
    t('TRUSTED BY TOP BRANDS & GROWING BUSINESSES',{left:48,top:52,fontSize:9,fill:BRAND.textMuted,charSpacing:60}),
    ...brands.flatMap((b,i)=>{
      const col=i%perRow, row=Math.floor(i/perRow), x=48+col*(bw+8), y=74+row*(bh+8);
      return [
        r({left:x,top:y,width:bw,height:bh,fill:BRAND.white,stroke:BRAND.cardBorder,strokeWidth:1,rx:5,ry:5}),
        t(b,{left:x+4,top:y+10,width:bw-8,fontSize:9,fill:BRAND.textDark,textAlign:'center'}),
      ];
    }),
    t('DIGITAL PRODUCTS WE BUILD',{left:48,top:314,fontSize:9,fontWeight:'bold',fill:BRAND.textMuted,charSpacing:60}),
    ...digital.flatMap((p,i)=>{
      const x=48+i*148;
      return [
        r({left:x,top:334,width:140,height:bh,fill:BRAND.white,stroke:BRAND.cardBorder,strokeWidth:1,rx:5,ry:5}),
        t(p,{left:x+4,top:344,width:132,fontSize:9,fill:BRAND.textDark,textAlign:'center'}),
      ];
    }),
    t('07',{left:890,top:510,fontSize:10,fill:BRAND.textMuted}),
  ]};
}

function slide8(): SlideDefinition {
  return { id:'slide-8', name:'Thank You', background:BRAND.orange, objects:[
    hex(CANVAS_W/2,168,46,BRAND.yellow,4),
    t('Thank You!',{left:0,top:228,width:CANVAS_W,fontSize:36,fontWeight:'bold',fill:BRAND.white,textAlign:'center'}),
    t('PROPELBEES',{left:0,top:282,width:CANVAS_W,fontSize:15,fontWeight:'bold',fill:BRAND.white,textAlign:'center',charSpacing:180}),
    t('Social Media Production · Branding · SEO · AEO · Meta & Google Ads',{left:0,top:310,width:CANVAS_W,fontSize:12,fill:'#FFE8D6',textAlign:'center'}),
    t('propelbees.com',{left:0,top:336,width:CANVAS_W,fontSize:12,fill:'#FFE8D6',textAlign:'center'}),
  ]};
}

export const PROPELBEES_TEMPLATE: SlideDefinition[] = [slide1(),slide2(),slide3(),slide4(),slide5(),slide6(),slide7(),slide8()];

export const TEMPLATES = [
  { id:'propelbees-social-media', name:'Social Media & Meta Ads', description:'Propelbees branded proposal for social media production and Meta Ads services', thumbnail:BRAND.orange, slides:PROPELBEES_TEMPLATE },
];
