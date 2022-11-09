# Twitter-Stream

## メモ

```
// Delete rules
client.v2.updateStreamRules({
    delete: {
        ids: [<id>]
    }
})

// Add rules
client.v2.updateStreamRules({
    add: [
        { value: '@sequent_bot' }
    ]
})

// Print rules
(async () => {
    const rules = await client.v2.streamRules()
    console.log(rules)
})()
```

## fly.ioへのデプロイ

```
# fly.ioへログイン
flyctl auth login
# appのlaunch
flyctl launch
# appのdeploy
flyctl deploy
```
