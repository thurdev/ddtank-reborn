-- SQL_STORED_PROCEDURE dbo.Ddtc_AutoOut_Access_1 (modified 2012-04-21T07:53:24.763)















-- =============================================
-- Author:		小危
-- ALTER  date: 2009-06-18
-- Description:	自动导出成指定一天的Access文件
-- =============================================
CREATE   PROCEDURE [dbo].[Ddtc_AutoOut_Access_1]	
@CurrentDate DateTime
AS
BEGIN
/*第一步：定义初始数据*/
Declare @ApplicationId int     --定义当前游戏类型
Declare @SubId Int             --定义当前代理商
Select Top 1 @ApplicationId=ApplicationId,@SubId=SubId from Db_Count.dbo.Count_Application_Sub


Declare @Op_Date DateTime     --指定一天时间
--Set @Op_Date=DateAdd(Day,-1,Getdate())
Set @Op_Date=@CurrentDate

Declare @FilePath Varchar(200)  --定义当前日志保存位置
Set @FilePath='D:\GameLog\access'     

Declare @FileName Varchar(200)  --定义今天的文件
Set @FileName= Cast(@ApplicationId As Varchar(20))+'_'+Cast(@SubId As Varchar(20))+'_'+Convert(varchar(10),@Op_Date,112)+'_'+'dbcount.mdb'

Declare @FileAll Varchar(200)   --定义当前文件完整路径
Set @FileAll=@FilePath+'\'+@FileName

Declare @Op Varchar(200)        --定义操作方式
Set @Op='copy '+@FilePath+'\dbcount1.mdb ' +@FileAll
Exec master..xp_cmdshell  @Op   --先Copy一个新文件




/*第二步：向Access插入数据*/
Declare  @SqlString Varchar(4000)  
--加入的用户资料(近三天)
Set @SqlString='
insert into   OPENROWSET(''Microsoft.Jet.OLEDB.4.0'', '''+@FileAll+''';''admin'';'''', Old_UserInfo)
       (ApplicationId, SubId,UserID, UserName, NickName, Date, IsConsortia, ConsortiaID, Sex, Win, Total, GP, Honor, Gold, Money, Grade, State, IsFirst, Repute, 
        LastDate, ChargeDate, ExpendDate, ActiveIP, ForbidDate, LastDateSecond, LastDateThird, LoginCount, OnlineTime)
SELECT  '+Cast(@ApplicationId As  Varchar(10))+','+Cast(@SubId As  Varchar(10))+', UserID, left(UserName,50), NickName, Date, IsConsortia, ConsortiaID, Sex, Win, Total, GP, Honor, Gold, Money, Grade, State, IsFirst, Repute, 
        LastDate, ChargeDate, ExpendDate, ActiveIP, ForbidDate, LastDateSecond, LastDateThird, LoginCount, OnlineTime
FROM    Db_Tank.dbo.Sys_Users_Detail with(nolock) 
        Where  Convert(Char(10), date,120)='''+Convert(Char(10),@Op_Date,120)+''' Or Convert(Char(10), lastdate,120)='''+Convert(Char(10),@Op_Date,120)+''' Or Convert(Char(10), LastDateSecond,120)='''+Convert(Char(10),@Op_Date,120)+'''  Or Convert(Char(10), LastDateThird,120)='''+Convert(Char(10),@Op_Date,120)+''' '   
Exec (@SqlString)

 

--加入商品信息(近一天)
/*Set @SqlString='
insert into   OPENROWSET(''Microsoft.Jet.OLEDB.4.0'', '''+@FileAll+''';''admin'';'''', Old_Shop_Good)
       (ApplicationId,subid, TemplateID, Name, Remark, CategoryID, Description, Attack, Defence, Agility, Luck, [Level], Quality, Pic, Money, Gold, MaxCount, 
                      NeedSex, NeedLevel, CanStrengthen, CanCompose, CanDrop, CanEquip, CanUse, CanDelete, Valid, Count, AddTime, BindType, PayType, BuyType, 
                      Price1, Value1, Agio1, Price2, Value2, Agio2, Price3, Value3, Agio3)
SELECT  '+Cast(@ApplicationId As  Varchar(10))+','+Cast(@SubId As  Varchar(10))+', TemplateID, Name, Remark, CategoryID, Description, Attack, Defence, Agility, Luck, [Level], Quality, Pic, Money, Gold, MaxCount, 
                      NeedSex, NeedLevel, CanStrengthen, CanCompose, CanDrop, CanEquip, CanUse, CanDelete, Valid, Count, AddTime, BindType, PayType, BuyType, 
                      Price1, Value1, Agio1, Price2, Value2, Agio2, Price3, Value3, Agio3
FROM    Db_Tank.dbo.Shop_Goods with(nolock)'
Exec (@SqlString)
*/
         

--加入商品购买信息表(近一天)
Set @SqlString='
insert into   OPENROWSET(''Microsoft.Jet.OLEDB.4.0'', '''+@FileAll+''';''admin'';'''', Old_Shop)
       (ApplicationId, SubId, UserId, Money, Gold, EnterTime, GoodId, GoodsType)
SELECT  '+Cast(@ApplicationId As  Varchar(10))+','+Cast(@SubId As  Varchar(10))+', UserId, Money, Gold, EnterTime, GoodId, GoodsType
FROM    Db_Count.dbo.Count_Shop
        Where Convert(Char(10),EnterTime,120)='''+Convert(Char(10),@Op_Date,120)+'''' 
              
Exec (@SqlString)



--加入用户充值信息
Set @SqlString='
insert into   OPENROWSET(''Microsoft.Jet.OLEDB.4.0'', '''+@FileAll+''';''admin'';'''', Old_PayMent)
       (ApplicationId,SubId, ChargeID, UserName, Money, Date, CanUse, PayWay, NeedMoney, IP)
SELECT  '+Cast(@ApplicationId As  Varchar(10))+','+Cast(@SubId As  Varchar(10))+', ChargeID, UserName, Money, Date, CanUse, PayWay, NeedMoney, IP
FROM    Db_Tank.dbo.Charge_Money with(nolock)
        Where Convert(Char(10),date,120)='''+Convert(Char(10),@Op_Date,120)+'''' 
              
Exec (@SqlString)


END
















GO
