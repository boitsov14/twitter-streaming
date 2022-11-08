import 'dotenv/config'
import axios from 'axios'
import { TwitterApi, ETwitterStreamEvent, TweetV2 } from 'twitter-api-v2'
import process from 'process'
import { setTimeout } from 'timers/promises'

const client = new TwitterApi(process.env.BEARER_TOKEN!)

let date = ''
let count_info: { [key: string]: number } = {}
const MAX = 20

const streaming = async () => {
    const stream = await client.v2.searchStream().catch(async e => {
        console.log(e.rateLimit)
        console.log(e.data)
        // 15分待つ
        await setTimeout(900_000)
        return await Promise.reject(new Error('First Connection Error.'))
    })
    // Enable reconnect feature
    stream.autoReconnect = true
    // Awaits for a tweet
    stream.on(
        // Emitted when a Twitter payload (a tweet or not, given the endpoint).
        ETwitterStreamEvent.Data,
        // 取得したツイートの処理
        eventData => process_tweet(eventData.data)
    )
    stream.on(
        // Emitted when Node.js {response} emits a 'error' event (contains its payload).
        ETwitterStreamEvent.ConnectionError,
        e => {
            console.log(e)
            throw new Error('Connection Error.')
        }
    )
    stream.on(
        // Emitted when Node.js {response} is closed by remote or using .close().
        ETwitterStreamEvent.ConnectionClosed,
        () => { throw new Error('Connection Closed Error.') }
    )
    stream.on(
        // Emitted when a Twitter sent a signal to maintain connection active
        ETwitterStreamEvent.DataKeepAlive,
        () => console.log('>')
    )
    stream.on(
        // Emitted when nothing is received from Twitter.
        ETwitterStreamEvent.ConnectionLost,
        () => console.log('Connection has been lost.')
    )
    stream.on(
        // Emitted when a reconnection attempt succeeds
        ETwitterStreamEvent.Reconnected,
        () => console.log('Reconnection succeeds.')
    )
}

const process_tweet = async (data: TweetV2) => {
    // ツイート内容が"@sequent_bot"から始まっているかチェック
    if (!data.text.startsWith('@sequent_bot')) return
    // tweet idからusernameを取得
    const tweet_info = await client.v2.singleTweet(data.id, {
        expansions: 'author_id',
        'user.fields': 'username'
    })
    const username = tweet_info.includes?.users![0].username!
    console.log('before:', get_info())
    // 日付のアップデートとcount_infoの初期化
    update_date()
    // 制限回数を超えていないかチェック
    if (!check_count(username)) {
        console.log('Too many request')
        return
    }
    console.log('after:', get_info())
    // Proverに送信
    const tweet = {
        'id': data.id,
        'text': data.text,
        'username': username
    }
    console.log(tweet)
    const response = await axios.post(
        process.env.URL + '/twitter',
        tweet, {
        headers: {
            'Authorization': 'Bearer ' + process.env.PASSWORD!
        }
    }
    )
    console.log(response.data)
    // バックアップ
    const backup_response = await axios.post(process.env.BACKUP_URL + '?id=' + data.id)
    console.log(backup_response.data)
}

const get_info = () => {
    return {
        'date': date,
        'count_info': count_info
    }
}

const update_date = () => {
    const d = new Date();
    const new_date = (d.getMonth() + 1) + '/' + d.getDate()
    if (new_date !== date) {
        date = new_date
        count_info = {}
    }
}

const check_count = (username: string) => {
    if (!(username in count_info)) {
        count_info[username] = 1
        return true
    } else if (count_info[username] < MAX) {
        count_info[username]++
        return true
    } else {
        return false
    }
}

streaming()

console.log('Streaming started.')
