-- SQL_STORED_PROCEDURE dbo.Ddt_User_MoneysInfo_Sto (modified 2012-04-21T07:53:25.060)
--作者:jason	--日期:2010-01-27	--描述：用用点卷监控
CREATE PROCEDURE [dbo].[Ddt_User_MoneysInfo_Sto]
 @Nick_Name Varchar (50),  
 @Begin_Date Varchar(20), 
 @End_Date Varchar(20)
AS  
BEGIN 
if (@Nick_Name!=''or @Nick_Name=null)
begin
select  A.ID,A.ApplicationId,A.SubId,LineId,A.MastType,
              case A.MastType
        when '1' then '拍买'
        when '2' then '邮寄'
        when '3' then '商城'
	when '4' then '结婚'
	when '5' then '工会'
	when '6' then '物品'
	when '7' then '充值'
	when '8' then '奖励'
	when '9' then '开箱子'
        when '10' then '游戏战斗'
        end MastTypeName,    
A.SonType,
        case A.SonType
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
end sonTypeName,
A.UserID,A.EnterTime,A.Moneys,
  A.Gold,A.GiftToken,A.Offer,A.OtherPay,A.GoodId,B.NickName,B.UserName from db_logs.dbo.Log_Money as A
left join Db_Tank_Copy.dbo.Sys_users_detail as B on A.UserId=B.UserID 
where B.NickName=@Nick_Name and A.EnterTime>=@Begin_Date and A.EnterTime<=@End_Date
end
else
begin
 select  A.ID,A.ApplicationId,A.SubId,LineId,A.MastType,
              case A.MastType
        when '1' then '拍买'
        when '2' then '邮寄'
        when '3' then '商城'
	when '4' then '结婚'
	when '5' then '工会'
	when '6' then '物品'
	when '7' then '充值'
	when '8' then '奖励'
	when '9' then '开箱子'
        when '10' then '游戏战斗'
        end MastTypeName,    
A.SonType,
        case A.SonType
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
end sonTypeName,
A.UserID,A.EnterTime,A.Moneys,
  A.Gold,A.GiftToken,A.Offer,A.OtherPay,A.GoodId,B.NickName,B.UserName from db_logs.dbo.Log_Money as A
left join Db_Tank_Copy.dbo.Sys_users_detail as B on A.UserId=B.UserID where  A.EnterTime>=@Begin_Date and A.EnterTime<=@End_Date
end
END





GO
