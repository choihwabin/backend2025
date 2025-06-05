const express = require('express'); //express 기본 라우팅
const app = express(); //express 기본 라우팅
const port = 9070;
const cors = require('cors'); //교차출처공유 허용하기 위함
const mysql = require('mysql');  //mysql변수 선언
const bcrypt = require('bcrypt'); //해시 암호화를 위함
const jwt = require('jsonwebtoken'); //토큰 생성을 위함
const SECRET_KEY = 'test';

app.use(cors());
app.use(express.json()); //JSON 본문 파싱 미들웨어

//mysql 연결 정보 셋팅
const connection = mysql.createConnection({
  host:'database',
  user:'root',
  password:'1234',
  database:'kdt'
});

//MYSQL DB접속시 오류가 나면 에러 출력하기, 성공하면 '성공'표시하기
connection.connect((err)=>{
  if(err){
    console.log('MYSQL연결 실패 : ', err);
    return;
  }
  console.log('MYSQL연결 성공');
});

// 로그인 회원가입

//3. 로그인 폼에서 post방식으로 전달받은 데이터를 DB에 조회하여 결과값을 리턴함.
app.post('/login', (req, res)=>{
  const {username, password} = req.body;

  connection.query('SELECT * FROM users WHERE username=?',[username], async(err, result)=>{
    if(err||result.length===0){
      return res.status(401).json({error:'아이디 또는 비밀번호가 틀립니다.'});
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch){
      return res.status(401).json({error : '아이디 또는 비밀번호가 틀립니다.'})
    }

    //토큰 생성(1시간)
    const token = jwt.sign({id: user.id, username: user.username}, SECRET_KEY, {expiresIn: '1h'});

    //토큰 발급
    res.json({token});
  });
});

// 로그인 2
app.post('/login2', (req, res)=>{
  const {username, password, tel, email} = req.body;
  connection.query("SELECT * FROM users2 WHERE username=?",[username], async(err, result)=>{
    if(err||result.length===0){
      return res.status(401).json({error:'아이디 또는 비밀번호가 틀립니다.'});
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
      return res.status(401).josn({error: '아이디 또는 비밀번호가 틀립니다.'})
    }
    // 토큰생성(1시간)
    const token = jwt.sign({id: user.id, username: user.username}, SECRET_KEY, {expiresIn: '1h'});
    // 토큰 발급
    res.json({token});
  });
});

//4. Resister.js에서 넘겨 받은 username, password를 sql db에 입력하여 추가한다.
app.post('/register', async(req, res) => {
  const {username, password} = req.body;
  const hash = await bcrypt.hash(password, 10); //패스워드 hash암호화

  connection.query(
    'INSERT INTO users (username, password) VALUES (?, ?)', [username, hash],
    (err) => {
      if(err){
        if(err.code == 'ER_DUP_ENTRY'){
          return res.status(400).json({error:'이미 존재하는 아이디입니다.'});
        }
        return res.status(500).json({error:'회원가입 실패'});
      }
      res.json({success:true});
    }
  );
});

app.post('/register2', async(req, res)=>{
  const {username, password, tel, email} = req.body;
  const hash = await bcrypt.hash(password, 10); //패스워드 hash암호화

  connection.query("INSERT INTO users2 (username, password, tel, email) VALUES (?,?,?,?)", [username, hash, tel, email],(err)=>{
    if(err){
      if(err.code == 'ER_DUP_ENTRY'){
        return res.status(400).json({error:'이미 존재하는 아이디입니다.'});
      }
      return res.status(500).json({error:'회원가입 실패'});
    }
    res.json({success:true});
  });
});



//방법1. db연결 테스트 - 메세지만 확인하기 위함
// app.get('/', (req,res)=>{
//   //특정 경로로 요청된 정보를 처리
//   res.json('Excused from Backend');
// });

//방법2. SQL쿼리문을 사용하여 DB에서 조회된 데이터를 출력한다.(Read)
//1. 상품목록 조회하기
//상품목록은 상품코드(g_code), 상품명(g_name), 상품가격(g_cost)으로 구성되어 있다.
app.get('/goods', (req,res)=>{
  connection.query("SELECT * FROM goods ORDER BY goods. g_code DESC", (err, results)=>{
    if(err){
      console.log('쿼리문 오류 : ', err);
      res.status(500).json({error: 'DB쿼리 오류'});
      return;
    }
    res.json(results);
  })
});

//2. 상품삭제(DELETE)
//상품삭제는 상품코드(g_code)를 기준으로 삭제한다.
app.delete('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  connection.query(
    'DELETE FROM goods WHERE g_code = ?',
    [g_code],
    (err, result) => {
      if (err) {
        console.log('삭제 오류:', err);
        res.status(500).json({ error: '상품 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

//3. 상품수정 (UPDATE)
//상품수정은 상품코드(g_code)를 기준으로 수정한다.
app.put('/goods/update/:g_code', (req, res)=>{
  const g_code = req.params.g_code;
  const {g_name, g_cost} = req.body;

  //update쿼리문 작성하여 실행
  connection.query(
    'UPDATE goods SET g_name = ?, g_cost= ? where g_code= ?', [g_name, g_cost, g_code],
    (err, result) => {
      if(err){
        console.log('수정 오류 : ', err);
        res.status(500).json({error : '상품 수정하기 실패'});
        return;
      }
      res.json({success:true});
    }
  );
});


//4. 특정상품 조회하기(SELECT)
// 특정 상품 조회 (GET /goods/:g_code)
app.get('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;

  connection.query(
    'SELECT * FROM goods WHERE g_code = ?',
    [g_code],
    (err, results) => {
      if (err) {
        console.log('조회 오류:', err);
        res.status(500).json({ error: '상품 조회 실패' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: '해당 상품이 없습니다.' });
        return;
      }
      res.json(results[0]); // 단일 객체만 반환
    }
  );
});

//5. 상품등록하기(create, INSERT INTO)
//post방식으로 /goods로 받음
app.post('/goods', (req, res)=>{
  const {g_name, g_cost} = req.body;

  if(!g_name||!g_cost){
    return res.status(400).json({error:'필수 항목이 누락되었습니다. 다시 확인하세요.'});
  }

  // 쿼리문 실행
  connection.query(
    'INSERT INTO goods (g_name, g_cost) VALUES(?,?)', [g_name, g_cost], (err, result)=>{
    if(err){
      console.log('DB등록 실패 : ', err);
      res.status(500).json({error : '상품 등록 실패'});
      return;
    }
    res.json({success:true, insertId: result.insertId})
  }
  );
});


// books 

//1. 교보문고 상품목록 조회하기(books)
app.get('/book_store2', (req,res)=>{
  connection.query('SELECT * FROM book_store2 ORDER BY book_store2.CODE DESC', (err, results)=>{
    if(err){
      console.log('쿼리문 오류 : ', err);
      res.status(500).json({error: 'DB쿼리 오류'});
      return;
    }
    res.json(results);
  });
});

//2. books 상품삭제(DELETE)
app.delete('/book_store2/:CODE', (req,res)=>{
  const CODE = req.params.CODE;
  connection.query('DELETE FROM book_store2 WHERE CODE=?', [CODE],
    (err, result)=>{
      if(err){
        console.log('삭제 오류 : ', err);
        res.status(500).json({error: '상품 삭제 실패'});
        return;
      }
      res.json({success: true});
    }
  );
});

//3. books 상품수정(UPDATE)
app.put('/books/book_update/:CODE', (req,res)=>{
  const CODE = req.params.CODE;
  const {NAME, AREA1, AREA2, AREA3, BOOK_CNT, OWNER_NUM, TEL_NUM} = req.body;

  connection.query('UPDATE book_store2 SET NAME=?, AREA1=?, AREA2=?, AREA3=?, BOOK_CNT=?, OWNER_NUM=?, TEL_NUM=? WHERE CODE=?', [NAME, AREA1, AREA2, AREA3, BOOK_CNT, OWNER_NUM, TEL_NUM, CODE], (err,result)=>{
    if(err){
      console.log('수정 오류 : ', err);
      res.status(500).json({error: '상품 수정 실패'});
      return;
    }
    res.json({success:true});
  });
});


//4. books 특정상품 조회(SELECT)
app.get('/books/:CODE', (req,res)=>{
  const CODE = req.params.CODE;
  
  connection.query('SELECT * FROM book_store2 WHERE CODE=?', [CODE],
    (err,results)=>{
      if(err){
        console.log('조회오류', err);
        res.status(500).json({error: '상품 조회 실패'});
        return;
      }
      if(results.length===0){
        res.status(404).json({error: '해당 상품이 없습니다.'});
        return;
      }
      res.json(results[0]); //단일 객체만 반환
    }
  );
});


//5. books 상품등록하기(INSERT)
app.post('/books', (req,res)=>{
  const {NAME, AREA1, AREA2, AREA3, BOOK_CNT, OWNER_NUM, TEL_NUM} = req.body;
  
  // 글 작성 안했을 시
  if(!NAME || !AREA1 || !AREA2 || !AREA3 || !BOOK_CNT || !OWNER_NUM || !TEL_NUM){
    return res.status(400).json({error:'필수 항목이 누락되었습니다. 다시 확인해주세요.'});
  }

  connection.query('INSERT INTO book_store2 (NAME, AREA1, AREA2, AREA3, BOOK_CNT, OWNER_NUM, TEL_NUM) VALUES(?,?,?,?,?,?,?)',[NAME, AREA1, AREA2, AREA3, BOOK_CNT, OWNER_NUM, TEL_NUM], (err, result)=>{
    if(err){
      console.log('DB등록 실패', err);
      res.status(500).json({error:'상품 등록 실패'});
      return;
    }
    res.json({success:true, insertId : result.insertId})
  });
});

// Fruits

//1. fruit 상품목록 조회(SELECT)
app.get('/fruits', (req, res)=>{
  connection.query('SELECT * FROM fruit ORDER BY fruit. num DESC', (err,results)=>{
    //에러가 뜨면 에러문구 출력
    if(err){
    console.log('쿼리문 오류 : ', err);
    res.status(500).json({error: 'DB쿼리 오류'});
    return;
    }
      //json데이터로 결과를 저장
  res.json(results);
  });
});

//2. FRUIT 상품삭제(DELETE)
app.delete('/fruits/:num', (req, res)=>{

})
//3. Fruit 상품수정(UPDATE)
app.put('/fruits/fruit_update/:num', (req,res)=>{
  const num = req.params.num;
  const {name, color, price, country} = req.body;

  connection.query('UPDATE fruit SET name=?, color=?, price=?, country=? WHERE num=?', [name, color, price, country, num], (err, result)=>{
    if(err){
      console.log('수정 오류 : ', err);
      res.status(500).json({error:'상품 수정 실패'});
      return;
    }
    res.json({success:true});
  });
});
//4. Fruit 특정상품 조회(SELECT)
app.get('/fruits/:num', (req,res)=>{
  const num = req.params.num;

  connection.query('SELECT * FROM fruit WHERE num=?', [num],
    (err,results)=>{
      if(err){
        console.log('조회오류 : ', err);
        res.status(500).josn({error:'상품 조회 실패'})
        return;
      }
      if(results.length===0){
        res.status(404).json({error:'해당 상품이 없습니다.'});
        return;
      }
      res.json(results[0]);
    }
  );
});
//5. Fruit 상품등록(INSERT)
app.post('/fruits', (req, res)=>{
  const {name, color, price, country} = req.body;

  if(!name || !color || !price || !country){
    return res.status(400).json({error:'필수 항목이 누락되었습니다. 다시 확인해주세요.'}
    )}

    connection.query('INSERT INTO fruit (name, color, price, country) VALUES(?,?,?,?)', [name, color, price, country],(err, result)=>{
      if(err){
        console.log('DB등록 실패', err)
        res.status(500).json({error:'상품등록 실패'})
        return 
      }
      res.json({success:true, insertId:result.insertId});
    });
});

//Question 등록하기
app.post('/question', (req, res)=>{
  const {name, tel, email, txtbox} = req.body;
  if(!name || !tel || !email || !txtbox){
    return res.status(400).json({error:'필수 항목이 누락되었습니다. 다시 확인해주세요.'});
  }
  // 변수에 저장된 데이터를 MYSQL쿼리문으로 DB에 입력
  connection.query(
    'INSERT INTO question (name, tel, email, txtbox) VALUES(?,?,?,?)', [name, tel, email, txtbox],(err, result)=>{
      if(err){
        console.log('전송 오류 : ', err);
        res.status(500).json({error:'전송 실패'});
        return
      }
      res.send('질문 전송 완료');
    })
})

// 질문 수 카운트
app.get('/question/count', (req, res) => {
  connection.query('SELECT COUNT(*) AS count FROM question', (err, results) => {
    if (err) {
      res.json({ count: 0 });
      return;
    }
    res.json({ count: results[0].count });
  });
});



//서버실행  
app.listen(port, ()=>{
  console.log('Listening...');
});


