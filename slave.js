const express=require('express'),TelegramBot=require('node-telegram-bot-api'),localtunnel=require('localtunnel'),{exec}=require('child_process'),https=require('https'),os=require('os');
const TOKEN='7588647057:AAE_1kfJBAZggHQoVs7c1LVHaOBs2c6qGfU',ID_NHOM='7371969470',CONG=Math.floor(Math.random()*2000)+8000,TEN_MAY=os.hostname(),LA_MASTER=process.env.MASTER==='true',URL_MASTER=process.env.MASTER_URL;
const app=express();app.use(express.json());const bot=new TelegramBot(TOKEN,{polling:false});
let danhSachSlave=[],thoiDiemBatDau=Math.floor(Date.now()/1000);

const chayLenh=(lenh,callback)=>{exec(lenh,(loi,ketQua,loiChu)=>callback(loi?(loiChu||loi.message).trim():(ketQua||'').trim()));};
const thongBaoMatKetNoi=(url)=>{const slave=danhSachSlave.find(s=>s.url===url);if(slave)bot.sendMessage(ID_NHOM,`⚠️ *${slave.tenMay} (${slave.stt}) mất kết nối!*`,{parse_mode:'Markdown'});danhSachSlave=danhSachSlave.filter(s=>s.url!==url);};
const guiRequest=(options,duLieu,callback)=>{const req=https.request(options,phanHoi=>{let duLieu='';phanHoi.on('data',chunk=>duLieu+=chunk);phanHoi.on('end',()=>callback(duLieu.includes('<html>')?`Lỗi: ${duLieu.match(/<h1>(.*?)<\/h1>/)?.[1]||'Không xác định'}`:duLieu));});req.on('error',loi=>callback(`Lỗi: ${loi.message}`));if(duLieu)req.write(duLieu);req.end();};
const guiTin=(id,text,markdown=true)=>{bot.sendMessage(id,text,markdown?{parse_mode:'Markdown'}:{});};
const formatStatus=(b)=>`${b.loai==='master'?'👑 *Master*':'🤖 *Slave*'}: ${b.ten}\n*Port:* ${b.port}\n*Uptime:* \`${b.uptime}\``;
const taoSTT=()=>{const sttDaDung=danhSachSlave.map(s=>s.stt);for(let i=1;i<=danhSachSlave.length+1;i++)if(!sttDaDung.includes(i))return i;return danhSachSlave.length+1;};
const NEOFETCH_CMD='[ -f neofetch/neofetch ] && ./neofetch/neofetch --stdout || (git clone https://github.com/dylanaraps/neofetch && ./neofetch/neofetch --stdout)';
setInterval(()=>{const bayGio=Date.now();danhSachSlave.forEach(s=>{if(bayGio-s.lanCuoiPing>10000)thongBaoMatKetNoi(s.url);});},2000);

app.post(`/bot${TOKEN}`,(req,res)=>{
  const tinNhan=req.body?.message;if(!tinNhan?.text||tinNhan.date<thoiDiemBatDau)return res.sendStatus(200);
  const noiDung=tinNhan.text.trim(),id=tinNhan.chat.id,thongBaoDangChay=(loai,soLuong=1)=>guiTin(id,`🔄 Đang thực hiện lệnh ${loai==='master'?'trên Master':`trên ${soLuong} Slave`}...`,false);
  if(noiDung==='/help'){guiTin(id,'/status - Kiểm tra bot\n/slave <lệnh> - Chạy lệnh trên slave\n/master <lệnh> - Chạy lệnh trên master\n/help - Trợ giúp');return res.sendStatus(200);}
  if(noiDung==='/status'){
    Promise.all([new Promise(resolve=>chayLenh('uptime',ketQua=>resolve({loai:'master',ten:TEN_MAY,uptime:ketQua,port:CONG}))),...danhSachSlave.map(s=>new Promise(resolve=>guiRequest({hostname:new URL(s.url).hostname,path:'/uptime',method:'GET',timeout:5000},null,duLieu=>resolve({loai:'slave',ten:`${s.tenMay} (${s.stt})`,uptime:duLieu.trim(),port:s.port}))))]).then(tatCa=>guiTin(id,`*🟢 Bots online (${tatCa.length}):*\n\n${tatCa.map(formatStatus).join('\n\n')}`));return res.sendStatus(200);
  }
  if(noiDung.startsWith('/slave')){
    const lenh=noiDung.slice(6).trim();if(!lenh){guiTin(id,'⚠️ *Nhập lệnh sau /slave*');return res.sendStatus(200);}
    if(!danhSachSlave.length){guiTin(id,'⚠️ *Không có slave nào online*');return res.sendStatus(200);}
    thongBaoDangChay('slave',danhSachSlave.length);
    Promise.all(danhSachSlave.map(({url,tenMay,stt,port})=>new Promise(resolve=>guiRequest({hostname:new URL(url).hostname,path:'/exec',method:'POST',timeout:0,headers:{'Content-Type':'application/json'}},JSON.stringify({cmd:lenh}),duLieu=>resolve({stt,tenMay,port,ketQua:duLieu.includes('Lỗi:')?duLieu:`\`\`\`\n${duLieu.trim()}\n\`\`\``}))))).then(ketQuas=>ketQuas.forEach(({stt,tenMay,port,ketQua})=>guiTin(id,`💻 *Slave ${stt} ${tenMay} (Port:${port}):*\n${ketQua}`)));return res.sendStatus(200);
  }
  if(noiDung.startsWith('/master')){
    const lenh=noiDung.slice(7).trim();if(!lenh){guiTin(id,'⚠️ *Nhập lệnh sau /master*');return res.sendStatus(200);}
    thongBaoDangChay('master');
    chayLenh(lenh,ketQua=>guiTin(id,`💻 *Master ${TEN_MAY} (Port:${CONG}):*\n\`\`\`\n${ketQua}\n\`\`\``));return res.sendStatus(200);
  }
  res.sendStatus(200);
});

app.post('/exec',(req,res)=>{chayLenh(req.body?.cmd||'',ketQua=>res.send(ketQua));});
app.get('/uptime',(req,res)=>{chayLenh('uptime',ketQua=>res.send(ketQua));});
app.post('/register',(req,res)=>{const{port,url,hostname,report}=req.body||{};if(!port||!url||!hostname)return res.sendStatus(400);
  const stt=taoSTT();danhSachSlave=danhSachSlave.filter(s=>s.url!==url).concat({port,url,tenMay:hostname,lanCuoiPing:Date.now(),stt});
  guiRequest({hostname:new URL(url).hostname,path:'/exec',method:'POST',headers:{'Content-Type':'application/json'}},JSON.stringify({cmd:NEOFETCH_CMD}),ketQua=>guiTin(ID_NHOM,`📩 *Slave ${stt} đăng ký:*\n*Tên máy:* ${hostname}\n*Port:* ${port}\n*URL:* ${url}\n\n\`\`\`\n${ketQua||report||''}\n\`\`\``));res.sendStatus(200);
});
app.post('/ping',(req,res)=>{const slave=danhSachSlave.find(s=>s.url===req.body?.url);if(slave)slave.lanCuoiPing=Date.now();res.sendStatus(200);});

app.listen(CONG,async()=>{
  try{
    const tunnel=await localtunnel({port:CONG,subdomain:`negancsl${Math.floor(Math.random()*900)+100}`}),urlTunnel=tunnel.url;
    console.log(`🚀 Cổng ${CONG}\n🌍 URL ${urlTunnel}`);
    chayLenh(NEOFETCH_CMD,ketQua=>{
      if(LA_MASTER){
        bot.setWebHook(`${urlTunnel}/bot${TOKEN}`);
        guiTin(ID_NHOM,`👑 *Master khởi động*\n*Máy chủ:* ${TEN_MAY}\n*Port:* ${CONG}\n*URL:* ${urlTunnel}\n\n\`\`\`\n${ketQua}\n\`\`\``);
        guiTin(ID_NHOM,`💡 *Chạy slave:*\n\`\`\`\nMASTER_URL=${urlTunnel} node bot.js\n\`\`\``);
      }else if(URL_MASTER){
        guiRequest({hostname:new URL(URL_MASTER).hostname,path:'/register',method:'POST',headers:{'Content-Type':'application/json'}},JSON.stringify({port:CONG,url:urlTunnel,hostname:TEN_MAY,report:ketQua}),()=>{});
        setInterval(()=>guiRequest({hostname:new URL(URL_MASTER).hostname,path:'/ping',method:'POST',headers:{'Content-Type':'application/json'}},JSON.stringify({url:urlTunnel}),()=>{}),3000);
      }
    });
  }catch(e){console.error('Lỗi localtunnel:',e);}
});
