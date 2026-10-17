-- VIEW dbo.Count_LogMoney_View (modified 2012-04-21T07:53:25.217)
CREATE  VIEW [dbo].[Count_LogMoney_View]
AS
select a.Id, 
MastType as MastTypeId,
case a.MastType
when '1' then '拍卖'
when '2' then '邮寄'
when '3' then '商城'
when '4' then '结婚'
when '5' then '公会'
when '6' then '物品'
when '7' then '充值'
when '8' then '奖励'
when '9' then '开箱子'
when '10' then '战斗'
end MastType,
SonType as SonTypeId,
case a.SonType
when '101' then '拍卖更新'
when '201' then '邮件中提取点卷'
when '202' then '付费邮件'
when '203' then '邮件点卷'
when '301' then '商城购买'
when '302' then '商城继费'
when '303' then '卡片使用'
when '304' then '商店赠送'
when '401' then '求婚'
when '402' then '举行婚礼'
when '403' then '发放礼金'
when '404' then '结婚房间续费'
when '405' then '离婚'
when '406' then '创建礼堂'
when '407' then '礼堂加时'
when '408' then '婚礼烟花'
when '410' then '结婚典礼'
when '412' then '公会捐赠'
when '601' then '物品转移'
when '602' then '物品颜色'
when '701' then '在线充值'
when '801' then '每日奖励'
when '802' then '任务奖励'
when '803' then '掉落'
when '804' then '答题'
when '805' then 'Boss掉落'
when '806' then '翻牌'
when '901' then '开箱子'
when '1001' then ' boos战'
when '1002' then '付费翻牌'
when '1003' then '再试一次'
when '1004' then '战斗中其他支付'
when '1005' then '开炮掉钱'
end SonType,
(select NickName from db_tank.dbo.sys_users_detail where userid = a.userid) 
as NickName,a.EnterTime,a.Moneys,a.Gold,a.GiftToken,a.OtherPay,GoodId from db_count.dbo.Log_Money as a 


GO
