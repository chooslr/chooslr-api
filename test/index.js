import assert from 'assert'
import request from 'supertest'
import join from 'url-join'
import createMock from '../mock.js'

const port = 7000
const prefix = '/prefix'
const base = `http://localhost:${port}${prefix}`
const jwtCookieName = 'chooslr:jwt'
const { CONSUMER_KEY, CONSUMER_SECRET, ACCESS_TOKEN, ACCESS_SECRET } = process.env

const { app, jwt } = createMock.server(prefix, CONSUMER_KEY, CONSUMER_SECRET, ACCESS_TOKEN, ACCESS_SECRET, { jwtCookieName, timeout: 20000 })
const { joinParams, default: Chooslr } = createMock.client()
const chooslr = new Chooslr(base, { proxy: join(base, 'proxy') }, { jwt })
const Cookie = jwtCookieName + '=' + jwt
const Authorization = 'Bearer ' + jwt

let server
before(() => server = app.listen(port))
after(() => server.close())

describe('/info', () => {

  const test = (user) => {
    const { name, likes, following, default_post_format, blogs } = user
    assert(typeof name === 'string')
    assert(typeof likes === 'number')
    assert(typeof following === 'number')
    assert(typeof default_post_format === 'string')
    assert(Array.isArray(blogs))
  }

  it('server', () =>
    request(server)
    .get(join(prefix, '/info'))
    .set('Cookie', Cookie)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { user } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      test(user)
    })
  )

  it(`client`, () => chooslr.user().then(user => test(user)))

})

describe('/followings', () => {

  const params = { limit: 5, offset: 20 }

  const test = (blogs) => assert(Array.isArray(blogs))

  it('server', () =>
    request(server)
    .get(join(prefix, '/followings' + joinParams(params)))
    .set('Authorization', Authorization)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { total_blogs, blogs } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(typeof total_blogs === 'number')
      test(blogs)
    })
  )

  it(`client`, () => chooslr.followings(params).then(blogs => test(blogs)))

})

describe('/explores', () => {

  it('server', () =>
    request(server)
    .get(join(prefix, '/explores'))
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { htmls } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(Array.isArray(htmls))
    })
  )

  it(`client`, () => chooslr.explores().then(names => Array.isArray(names)))

})

describe('/search', () => {

  const name = 'kthjm'
  const word = 'タンブラー'
  const page = 2

  it('server', () =>
    request(server)
    .get(join(prefix, '/search' + joinParams({ name, word: encodeURIComponent(word), page })))
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { posts } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(Array.isArray(posts))
    })
  )

  it(`client`, () => chooslr.search(name, word, page).then(posts => Array.isArray(posts)))

})

describe('/dashboard and /likes', () => {

  const params = { reblog_info: true, notes_info: true }

  const test = (posts) => {
    assert(Array.isArray(posts))
    assert(posts.some(({ notes }) => Array.isArray(notes)))
    assert(posts.some((post) => 'reblogged_from_name' in post && 'reblogged_root_name' in post))
  }

  it('server: dashboard', () =>
    request(server)
    .get(join(prefix, '/dashboard' + joinParams(params)))
    .set('Authorization', Authorization)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { posts } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      test(posts)
    })
  )

  it(`client: dashboard`, () => chooslr.dashboard(params).then(posts => test(posts)))

  it('server: likes', () =>
    request(server)
    .get(join(prefix, '/likes' + joinParams(params)))
    .set('Authorization', Authorization)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { liked_count, liked_posts } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(typeof liked_count === 'number')
      test(liked_posts)
    })
  )

  it(`client: likes`, () => chooslr.likes(params).then(liked_posts => test(liked_posts)))

})

describe('/follow and /unfollow', () => {

  const name = 'kthjm'

  it('server: follow', () =>
    request(server)
    .post(join(prefix, '/follow'))
    .send({ name })
    .set('Cookie', Cookie)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { blog } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(blog)
    })
  )

  it('server: unfollow', () =>
    request(server)
    .post(join(prefix, '/unfollow'))
    .send({ name })
    .set('Authorization', Authorization)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { blog } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(blog)
    })
  )

  it(`client: follow`, () => chooslr.follow(name).then(blog => assert(blog)))

  it(`client: unfollow`, () => chooslr.unfollow(name).then(blog => assert(blog)))

})

describe('/like and /unlike', () => {

  const id = '48609674'
  const reblog_key = 'DjTXsUxT'

  it('server: like', () =>
    request(server)
    .post(join(prefix, '/like'))
    .send({ id, reblog_key })
    .set('Cookie', Cookie)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(Array.isArray(response))
    })
  )

  it('server: unlike', () =>
    request(server)
    .post(join(prefix, '/unlike'))
    .send({ id, reblog_key })
    .set('Authorization', Authorization)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert(Array.isArray(response))
    })
  )

  it(`client: like`, () => chooslr.like(id, reblog_key).then(isSuccess => assert(isSuccess)))

  it(`client: unlike`, () => chooslr.unlike(id, reblog_key).then(isSuccess => assert(isSuccess)))

})

describe('/reblog and /delete', () => {

  const name = 'pthjm'
  const id = '171229531525'
  const reblog_key = 'ydj0DmZq'

  let created_id
  const createTest = (id) => {
    assert(typeof id === 'number')
    created_id = id
  }

  it('server: reblog', () =>
    request(server)
    .post(join(prefix, '/reblog'))
    .send({ name, id, reblog_key })
    .set('Cookie', Cookie)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { id } } = body
      assert.equal(status, 201)
      assert.equal(msg, 'Created')
      createTest(id)
    })
  )

  it('server: delete', () =>
    request(server)
    .post(join(prefix, '/delete'))
    .send({ name, id: created_id })
    .set('Authorization', Authorization)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status, msg }, response: { id } } = body
      assert.equal(status, 200)
      assert.equal(msg, 'OK')
      assert.equal(id, created_id)
    })
  )

  it(`server: reblog`, () => chooslr.reblog(name, id, reblog_key).then(id => createTest(id)))

  it(`server: delete`, () => chooslr.delete(name, created_id).then(id => assert.equal(id, created_id)))

})

describe('generateDashboard and generateLikes', () => {

  const test = (methodName) => async () => {
    const offset = 500
    const iterate2 = await chooslr[methodName]({ offset, limit: 2 })
    const iterate10 = await chooslr[methodName]({ offset, limit: 10 })

    // limit: 2 * 5 = 10
    const entries = []
    const pushPair = ({ value: posts }) => entries.push([posts[0].id, posts[posts.length - 1].id])
    await iterate2().then(pushPair)
    await iterate2().then(pushPair)
    await iterate2().then(pushPair)
    await iterate2().then(pushPair)
    await iterate2().then(pushPair)

    const tenIds = await iterate10().then(({ value: posts }) => posts.map(({ id }) => id))

    entries.forEach((pair, index) => {
      if (index === entries.length - 1) return

      const before_id = pair[1]
      const after_id = entries[index + 1][0]

      const beforeMatchIndex = tenIds.findIndex(id => id === before_id)
      const expext_after_id = beforeMatchIndex !== -1 && tenIds[beforeMatchIndex + 1]
      if (expext_after_id) assert.equal(after_id, expext_after_id)

      const afterMatchIndex = tenIds.findIndex(id => id === after_id)
      const expect_before_id = afterMatchIndex !== -1 && tenIds[afterMatchIndex - 1]
      if (expect_before_id) assert.equal(before_id, expect_before_id)
    })
  }

  it('generateDashboard', test('generateDashboard'))
  it('generateLikes', test('generateLikes'))
})

describe('generateFollowings and generateExplores and generateSearch', () => {

  const test = async (iterate) => {
    const { value, done } = await iterate()
    assert(typeof done === 'boolean')
    assert(Array.isArray(value))
  }

  it('generateFollowings', () => chooslr.generateFollowings().then(test))
  it('generateExplores', () => chooslr.generateExplores().then(test))
  it('generateSearch', () => chooslr.generateSearch({ name: 'kthjm', word: 'タンブラー' }).then(test))
})

describe('/extract', () => {

  it('server', () =>
    request(server)
    .get(join(prefix, '/extract'))
    .set('Cookie', Cookie)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(({ body }) => {
      const { meta: { status }, response: { jwt: extract_jwt } } = body
      assert.equal(status, 200)
      assert.equal(extract_jwt, jwt)
    })
  )

  it('client', () =>
    new Chooslr(base, { proxy: join(base, 'proxy') }).extract()
    .then(jwt => assert.equal(jwt, undefined))
    .catch(() => assert(false))
  )
})

describe('attach/detach', () => {
  const base = `http://localhost:${port}${prefix}`
  const redirect_url = '/hoge/fuga'

  it('/attach', () => assert.equal(
    new Chooslr(base, { api_key: CONSUMER_KEY }).attachURL(),
    `${base}/attach`
  ))

  it('/attach?redirect_url=', () => assert.equal(
    new Chooslr(base, { api_key: CONSUMER_KEY }).attachURL(redirect_url),
    `${base}/attach?redirect_url=${redirect_url}`
  ))

  it('/detach?redirect_url=', () => assert.equal(
    new Chooslr(base, { api_key: CONSUMER_KEY }).detachURL(redirect_url),
    `${base}/detach?redirect_url=${redirect_url}`
  ))
})