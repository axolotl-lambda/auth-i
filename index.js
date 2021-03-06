const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const bcrypt = require('bcryptjs')
const knex = require('knex')
const session = require('express-session')
const KnexSessionStore = require('connect-session-knex')(session)

const knexConfig = require('./knexfile.js')
const db = knex(knexConfig.development)

const server = express()

server.use(express.json())
server.use(cors())
server.use(helmet())
server.use(morgan('dev'))

server.use(
  session({
    name: 'raaaar',
    secret: 'Colorless green ideas sleep furiously',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: false
    },
    httpOnly: true,
    resave: false,
    saveUninitialized: false,
    store: new KnexSessionStore({
      tablename: 'sessions',
      sidfieldname: 'sid',
      knex: db,
      createtable: true,
      clearInterval: 24 * 60 * 60 * 1000
    })
  })
)

server.use(restricted)

// global middleware for checking restricted routes
function restricted(req, res, next) {
  if (req.url.match('/api/restricted')) {
    verifySession(req, res, next)
  } else {
    next()
  }
}

// middleware for authorizing
function verifySession(req, res, next) {
  if (req.session && req.session.name) {
    next()
  } else {
    res.status(401).json({ message: 'cannot access that resource' })
  }
}

server.post('/api/login', (req, res) => {
  const { username, password } = req.body

  db('users')
    .where({ username })
    .first()
    .then(user => {
      if (user && bcrypt.compareSync(password, user.password)) {
        req.session.name = username
        res.status(200).json({ message: 'logged in!' })
      } else {
        res.status(401).json({ message: 'log in faild :(' })
      }
    })
    .catch(err => res.status(500).json(err))
})

server.post('/api/register', (req, res) => {
  const { username, password } = req.body

  const hash = bcrypt.hashSync(password, 14)

  db('users')
    .insert({ username, password: hash })
    .then(ids => {
      res.status(201).json(ids)
    })
    .catch(err => {
      console.log(err)
      res.status(500).json(err)
    })
})

server.get('/api/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        res.send('error logging out')
      } else {
        res.send('you were logged out successfully')
      }
    })
  }
})

server.get('/api/restricted/users', (req, res) => {
  db('users')
    .select('id', 'username')
    .then(users => res.status(200).json(users))
    .catch(err => res.status(500).json(err))
})

server.listen(3300, () => console.log('\nrunning on port 3300\n'))
