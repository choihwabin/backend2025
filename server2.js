const express = require('express'); //express 라우팅
const app = express(); //express 기본 라우팅
const port = 9070;
const bcrypt = require('bcrypt'); //해시암호화
const jwt = require('jsonwebtoken'); //토큰 생성
const mysql = require('mysql'); //mysql변수선언
const cors = require('cors');// 교차 출처공유 허용
const SECRET_KEY = 'test';
app.use(cors());
app.use(express.json());

// sql db연결정보
const connection = mysql.createConnection({
  host:"localhost",
  user:"root",
  password:"1234",
  database:"kdt"
});

// db연결 실패시 에러 출력하기
connection.connect((err)=>{
  if(err){
    console.log('MYSQL 연결실패 : ', err);
    return;
  }
  console.log('MYSQL 연결 성공');
});

// 특정경로(/)로 요청된 정보를 처리하여 응답을 해준다.
// app.get('/', (req, res)=>{
//   res.json("Excuse from BackEnd");
// });

//회원가입시 사용자가 입력한 데이터를 가져와서 
//요청된 정보를 처리하여 응답을 해준다.
app.post('/register', async(req, res)=>{
  const {username, password, tel, email} = req.body;
  const hash = await bcrypt.hash(password, 10); //해시패스워드로 암호화
  
  connection.query("INSERT INTO ginipet_users (username, password, tel, email) VALUES(?,?,?,?)", [username, hash, tel, email],(err)=>{
    if(err){
      if(err.code == 'ER_DUP_ENTRY'){
        return res.status(400).json({error:'이미 존재하는 아이디입니다.'});
      }
      return res.status(500).json({error:'회원가입 실패'});
    }
    res.json({success:true});
  });
});

//로그인시 사용자가 입력한 username, password를 받아서 요청된 정보를 처리하여 응답을 해준다.
app.post('/login', (req, res)=>{
  const {username, password} = req.body;

  connection.query("SELECT * FROM ginipet_users WHERE username=?", [username], async(err,result)=>{
    if(err||result.length===0){
      return res.status(401).json({error:'아이디 또는 비밀번호가 틀렸습니다.'});
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch){
      return res.status(401).json({error: '아이디 또는 비밀번호가 틀립니다.'});
    }

    // 토큰 생성 1시간 설정

    const token = jwt.sign({id:user.id, username:user.username}, SECRET_KEY,{expiresIn:'1h'});
    // 토큰발급
    res.json({token});
  });
});

// 서버실행
app.listen(port, ()=>{
  console.log(`Server running at http://localhost:${port}`);
});