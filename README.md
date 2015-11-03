#FB Crawler for group
1. 此版本目前只能一次追蹤一個id
2. 執行方式:node run.js

##執行前，請到servive資料夾下修改兩個檔案 *shadow*, *shadowap*

- shadow格式
```json
{
    "id":"track id",    //追蹤的社團或粉絲頁id>
    "limit":20  //一次抓多少筆record,
    "version":"v2.5",   //graph api version
    "dir":"./fb_data",  //追蹤id詳細資料的預設存放路徑，包含已爬過的清單、error log、next page紀錄
    "depth":2,  //每次請求會回傳limit個結果，若需繼續往下找，可在這邊設定next page 深度
    "readInterval":""   //多久發一次graph api去抓頁面 Crontab格式 秒 分 時 日 月 星期
}

- shadowap格式
```json
{
    "id":"App ID",  //須申請開法者專案
    "yoyo":"App Secret", //須申請開法者專案
    "tomail":"",    //通知哪個信箱
    "frommail":"",  //發信者
    "mailNoticeTime":"* * * * * *" //Crawler通知還活著的時間  Crontab格式 秒 分 時 日 月 星期
}
```
##以及到control資料夾下修改*list* file

- list格式
```json
{
    "item":"item1,item2....,itemN",    //每筆想追蹤的物品、留言 都用逗號做為分隔
    "type":"none", //保留欄位
    "not":"none",  //保留欄位
    "match":0, //保留欄位
    "comment_track":"comment1,comment2...commentN" //每筆想追蹤的物品、留言 都用逗號做為分隔
}
```
