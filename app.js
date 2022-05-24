const express = require('express')
const app = express()
const port = 3000
const mysql = require('mysql')
const path = require('path')
// const bodyParser = require('body-parser')
const loginRouter = require('./routes/login')
const jwt = require('./modules/jwt')
const authUtil = require('./middlewares/auth').checkToken
const multer = require('multer');
const fs = require('fs')
const IMG_DIR = 'public/img';
const PROFILE_IMG_DIR = 'public/img/userProfile';
const POST_IMG_DIR = 'public/img/postPhoto';

let storage  = multer.diskStorage({ // 2
  destination(req, file, cb) {
    if(req.body.title==undefined){
      console.log("USER PROFILE IMG SAVE");
      cb(null, PROFILE_IMG_DIR+'/');
    } else {
      console.log("POST IMG SAVE");
      cb(null, POST_IMG_DIR+'/');
    }
  },
  filename(req, file, cb) {
    if(req.body.title==undefined){
      console.log("USER PROFILE IMG FILENAME");
      cb(null, `${req.body.mail}_${file.originalname}`);
    } else {
      console.log("POST IMG FILENAME");
      
      cb(null, `${req.body.nickname}_${new Date().toLocaleString}_${file.originalname}`);
    }
  },
});

let upload = multer({ storage: storage });

async function clean(file){
  fs.unlink(file, function(err){
    if(err) {
      console.log("Error : ", err)
    }
  })
}

const con = mysql.createConnection({
  host: 'localhost',
  user: 'workout',
  password: '1234',
  database: 'Today_workout_complete',
});

app.use(express.static('public'))
// application/json
app.use(express.json());
// application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))
app.use('/login', loginRouter)

//비밀번호변경전 확인
app.post('/api/checkPassword',(req, res) =>{
  const password = req.body.password;
  console.log(req.body);
  // console.log(req);

  const sql ='select password from memberinfo where password=?';
  con.query(sql, req.body.password, function (err, row, fields){
    let checkPassword = false;
    console.log(row);
    if(row.length == 0){ //중복되는게 없으면
      res.send({checkPassword: checkPassword});// 다시 checkid 객체를 클아이언트로 보낸다
    }
    else{
      checkPassword = true; // 중복돼서 사용 불가
      res.send({checkPassword: checkPassword});
    }
  })
})
//비밀번호 변경
app.patch('/api/updatePassword',(req, res)=>{
  const sql = 'update memberinfo set password=? where mail=?';
  const parameterList = [req.body.password, req.body.mail]
  accessDB_post(req, res, sql, parameterList);
})

// 0. 연결 확인 코드
con.connect(function(err) {
  if (err) throw err;
  console.log('Connected');
});

app.post('/uploadFile', upload.single('recfile'), function(req,res){ // 7
  console.log(req.body);
  console.log(req.file);
  res.send("-----")
});

// 유저 정보 변경(이메일, 이름, 자기소개, 이미지)
app.patch('/api/updateMyInfo', upload.single('profileImage'), function(req,res){ 
  const sql = 'update memberinfo set nickname = ?, introduction = ?, profile_img_path = ?  where mail = ?';
  console.log(req.body);
  console.log(req.file);

  let newFileName = req.file.filename
  if(newFileName==undefined)
    newFileName = req.body.profile_img_path
  
  // 기존 이미지 파일 삭제 코드
  console.log(PROFILE_IMG_DIR+'/' + req.body.profile_img_path);
  clean(PROFILE_IMG_DIR + '/' + req.body.profile_img_path);

  accessDB_patch(req, res, sql, [req.body.name, req.body.introduction, newFileName, req.body.mail])
});

app.put('/api/updateUserProfile', upload.single('profile_img'), (req, res) => {
  const sql = 'update memberinfo set profile_img_path=? where nickname=?';
  console.log(req.body);
  console.log(req.file);
  console.log(req.file.filename);
  accessDB_put(req, res, sql, [req.file.filename, req.body.nickname])
})

app.get('/', (req, res) => res.send('Hellosdfsd'))

app.get('/api/board', (req, res) => {
  const sql = "SELECT * FROM board"
  console.log(req.ip);
  console.log(res.url);

  console.log(req.path);
  console.log(req.url);
  console.log(req.url == '/board');

  accessDB_get(res, sql, [])
});

// 1. 회원가입
app.post('/api/join', (req, res) => {

  // 프로필 이미지 저장 및 경로 빼오기
  const profile_img_path = 'default'

  const sql = "INSERT INTO memberinfo VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1', default, default, null, null, 1, 1)"
  const parameterList = [req.body.mail, req.body.password, req.body.name,  req.body.introduction,
    req.body.phonenumber, req.body.address, req.body.sex, req.body.nickname,  profile_img_path]

  console.log(req.body);

  accessDB_post(req, res, sql, parameterList)
})

// id 중복검사
app.post('/api/checkid',(req, res) => {
  const mail = req.body.mail;
  console.log(req.body);
  // console.log(req);

  const sql ='select mail from memberinfo where mail=?';
  con.query(sql, req.body.mail, function (err, row, fields){
    let checkid;
    checkid=false;
    console.log(row);
    if(row.length == 0){ //중복되는게 없으면
      checkid = true;// 사용가능
      res.send({checkid: checkid});// 다시 checkid 객체를 클아이언트로 보낸다
    }
    else{
      checkid=false; // 중복돼서 사용 불가
      res.send({checkid: checkid});
    }
  })
});

// nickname 중복검사
app.post('/api/checkNickname',(req, res) =>{
  const nickname = req.body.nickname;
  console.log('nickname은', nickname);
  const sql ='select nickname from memberinfo where nickname=?';
  con.query(sql, nickname, function (err, row, fields){
    let checkNickname;
    checkNickname=false;
    if(row.length == 0){ //중복되는게 없으면
      checkNickname = true;// 사용가능
      res.send({checkNickname: checkNickname});// 다시 checkid 객체를 클아이언트로 보낸다
    }
    else{
      checkNickname=false; // 중복돼서 사용 불가
      res.send({checkNickname: checkNickname});
    }
  })
})

// 3. 로그인
app.post('/api/login', (req, res) => {
  console.log('login---------');

  const sql = "SELECT * FROM memberinfo WHERE mail = ? AND password = ?"
  const parameterList = [req.body.mail, req.body.password]
  console.log(req.body);

  accessDB_post(req, res, sql, parameterList)
})

// 4. 게시판 생성 authUtil
app.post('/api/createBoard', (req, res) => {

  const sql = "INSERT INTO board VALUES (NULL, ?, ?, ?, DEFAULT, ?, NULL)"
  const parameterList = [req.body.member_id, req.body.board_name, req.body.code, req.body.availability]

  console.log(req.body);

  accessDB_post(req, res, sql, parameterList)
})

app.get('/api/getBoard', (req, res) => {
  
  const sql = "SELECT board_id, board_name FROM board WHERE availability=1"

  accessDB_get(res, sql, []);
})

// 5. 게시글 생성
app.post('/api/createPost', upload.single('photographic_path'), (req, res)=>{

  const sql = "INSERT INTO post VALUES (NULL, ?, ?,?,?,?,?,DEFAULT,NULL,NULL, DEFAULT, DEFAULT,?,DEFAULT)"

  console.log(req.body);
  console.log(req.file);
  
  let newFileName = req.file.filename

  if(newFileName==undefined)
    console.log("사진 없음!");

  const parameterList =[req.body.board_id, req.body.nickname, req.body.title, req.body.content, req.ip, newFileName,req.body.availabilty_comments ];

  console.log(req.body);
  accessDB_post(req, res, sql, parameterList)
})

// // 게시글 가져오기 유산 ^~^
// app.get('/api/getPost',(req, res)=>{

//   const sql = "SELECT * FROM post where board_id =? limit ?,?"
//   const parameterList =[parseInt(req.query.board_id),parseInt(req.query.limit),parseInt(req.query.limit)+ 9]
//   console.log(req.query);
//   console.log(parameterList);

//   console.log(req.path);
//   accessDB_get(req, res, sql, parameterList)

// })

//커뮤니티 게시글 최신순부터 나열
app.get('/api/showPostDesc',(req,res) => {
  const sql = 'SELECT * FROM post ORDER BY creation_datetime desc limit ?,? '
  const parameterList=[req.query.nickname, parseInt((req.query.limit-1)*9),9]

  accessDB_get(req, res, sql, parameterList)
})

//커뮤니티 게시글 오래된순부터 나열
app.get('/api/showPostAsc',(req,res) => {
  const sql = 'SELECT * FROM post ORDER BY creation_datetime asc limit ?,?'
  const parameterList=[parseInt(req.query.limit),parseInt(req.query.limit)+9]
  accessDB_get(req, res, sql, parameterList)
})

// 게시글 가져오기
app.get('/api/getPostAll',(req, res)=>{

  const sql = "SELECT * FROM post where board_id =? limit ?,?"
  const parameterList =[parseInt(req.query.board_id), parseInt(req.query.limit), parseInt(req.query.limit) + 1000]
  console.log(req.query);
  console.log(parameterList);

  console.log(req.path);
  accessDB_get(req, res, sql, parameterList)

})

// 상세게시글 가져오기
app.get('/api/getPostDetail',(req, res)=>{

  const sql = "SELECT * FROM post where post_id =? "
  const parameterList =[parseInt(req.query.board_id), parseInt(req.query.limit), parseInt(req.query.limit) + 1000]
  console.log(req.query);
  console.log(parameterList);

  console.log(req.path);
  accessDB_get(req, res, sql, parameterList)

})
app.get('/api/showCategorySelect',(req, res)=>{

  const sql = "SELECT * FROM post where board_id =? limit ?,?"
  const parameterList =[parseInt(req.query.board_id), parseInt(req.query.limit), parseInt(req.query.limit) + 1000]
  console.log(req.query);
  console.log(parameterList);

  console.log(req.path);
  accessDB_get(req, res, sql, parameterList)

})
// 6. 댓글 생성
app.post('/api/comments', (req, res) => {

  const sql = "INSERT INTO comments (post_id, nickname, parent_comment_id, ip, content) VALUES (?,?,?,?,?)"
  let parent_comments_id;

  // if (req.body.parent_comments_id == 0)
  //  parent_comments_id = null
  parent_comment_id = null
  // ip=null;
  // post_id=5;
  delete_stats=1;
  const parameterList = [req.body.post_id, req.body.nickname, req.body.parent_comment_id,req.ip, req.body.content]
  
  console.log(req.body);
  console.log("ip는"+req.ip);

  accessDB_post(req, res, sql, parameterList)
})

// 게시물 모든 댓글 보여주기
app.get('/api/showComments',(req,res)=>{
  let id = parseInt(req.query.post_id);
  console.log(parseInt(id));
  const sql = "select * from comments where post_id=?"
  const parameterList=[req.query.post_id]
  // accessDB_get[req,res, sql, parameterList]
  con.query(sql, parameterList, async function (err, result, fields) {
    if (err) {
      console.log(err);
    } else if(result == undefined) {
      console.log('jjj');
      res.send("failure")
    } else {
      console.log(result);
      res.send(result);
    }
  });
  console.log(',,m4');
})

//댓글 수정
app.post('/api/updateComment',(req,res) => {
  const sql = "update comments set content=? where nickname=? and post_id=? and Comments_id =?"
  const parameterList =[req.query.content, req.query.nickname, req.query.post_id, req.query.comments_id]
  accessDB_post()
})



// 7. 게시물 제목 검색 기능 코드
app.get('/api/searchTitle',(req,res)=>{

  console.log(req.query);

  const sql = "select * from post where title LIKE " + "'%"+req.query.title+"%'"
  console.log(sql);
  
  con.query(sql ,function(err,result, fields){
    if (err) {
      console.log(err);
      res.send("failure")
    } else {
      console.log("쿼리 결과");
      console.log(result);
      res.send(result)
    }
  });
})


// GET 방식 DB 접근 함수
function accessDB_get(req, res, sql, parameterList) {
  
  con.query(sql, parameterList, function (err, result, fields) {
    if (err) {
      console.log(err);
      res.send("failure")
    } else if(result == undefined) {
      res.send("failure")
    } else {
      console.log("쿼리 결과");
      console.log(result, req.path);
      switch (req.path){
        case '/api/getPost':
          console.log('getPost11111');
          res.send(result);
          break;
        default:
          res.send(result)
          break;
      }
    }
  });
}

// POST 방식 DB 접근 함수
function accessDB_post(req, res, sql, parameterList) {
  
  con.query(sql, parameterList, async function (err, result, fields) {
    if (err) {
      console.log(err);
    } else if(result == undefined) {
      res.send("failure")
    } else {

      console.log("쿼리 결과");
      console.log(result, req.path);

      switch (req.path){
        case '/api/join':
          console.log('join');
          const joinJwtToken = await jwt.sign(req.body.mail)
          res.send({token: joinJwtToken.token})
          break
        case '/api/login':
          console.log('login');
          const loginJwtToken = await jwt.sign(req.body.mail)
          res.send({token: loginJwtToken.token, result: result})
          break
        default:
          res.send(result)
          break
      }
    }
  });
}

function accessDB_put(req, res, sql, parameterList) {
  con.query(sql, parameterList, async function (err, result, fields) {
    if (err) {
      console.log(err);
    } else if(result == undefined) {
      res.send("failure")
    } else {
      console.log(result);
      res.send(result)
    }
  });
}

function accessDB_patch(req, res, sql, parameterList) {
  con.query(sql, parameterList, async function (err, result, fields) {
    if (err) {
      console.log(err);
    } else if(result == undefined) {
      res.send("failure")
    } else {
      console.log(result);
      res.send({profile_img_path: req.file.filename})
    }
  });
}

app.get('/api/myPagePost',(req,res)=>{
  const sql = 'select * from post where nickname =? limit ?,?'
  const parameterList=[req.query.nickname, parseInt((req.query.limit-1)*9),9]
  accessDB_get(req, res, sql, parameterList)
})

//유저정보삭제
app.delete('/api/deleteUserInfo', (req,res)=>{
  const sql = 'delete from memberinfo where mail= ?'
  const parameterList=[req.query.mail]
  accessDB_post(req, res, sql, parameterList);
})

// 아이디 찾기
app.get('/api/findId', (req, res) =>{
  const sql = 'select mail from memberinfo where uesr_name = ? and phonenumber = ?'
  const parameterList=[req.query.uesr_name, req.query.phonenumber]
  accessDB_get(req, res, sql, parameterList);
})

// 비밀번호 찾기
app.get('/api/findPassword', (req,res) => {
  const sql = 'select password from memberinfo where mail = ? and uesr_name = ? and phonenumber = ?'
  const parameterList=[req.query.mail,req.query.uesr_name, req.query.phonenumber]
  accessDB_get(req, res, sql, parameterList);
})

// 게시글 삭제
app.delete('/api/deletePost', (req, res) => {
  const sql = 'delete from post where post_id= ?'
  console.log('삭제될 내용들', req.query.post_id);
  console.log(req.body);
  const parameterList=[req.query.post_id]
  console.log(parameterList)
  accessDB_post(req, res, sql, parameterList);
})

//라우터에서 설정되어 있지 않은 주소로 접속하려 할때
app.all('*', (req, res) => {
  res.status(404).send('PAGE NOT FOUND');
});

app.listen(port, () => {
  
  // public/img 폴더 없으면 생성
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR);
  else console.log("--------------");

  // public/img/userProfile 폴더 없으면 생성
  if (!fs.existsSync(PROFILE_IMG_DIR)) fs.mkdirSync(PROFILE_IMG_DIR);
  else console.log("--------------");

  // public/img/postPhoto 폴더 없으면 생성
  if (!fs.existsSync(POST_IMG_DIR)) fs.mkdirSync(POST_IMG_DIR);
  else console.log("--------------");

  console.log('Example prot: ${port}')
})