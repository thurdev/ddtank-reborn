-- SQL_STORED_PROCEDURE dbo.SP_AutoOut_Access (modified 2015-01-25T14:04:48.480)
-- =============================================
-- Author:		小危
-- ALTER  date: 2009-06-18
-- Description:	自动导出成指定一天的Access文件
-- =============================================
CREATE  PROCEDURE [dbo].[SP_AutoOut_Access]
  @CurrentDate DateTime
AS
Begin

/*第一步：定义初始数据*/
Declare @ApplicationId int                --定义当前游戏类型
Declare @SubId Int                        --定义当前代理商
Select Top 1 @ApplicationId=ApplicationId,@SubId=SubId from Db_Count.dbo.Count_Application_Sub
Declare @Op_Date DateTime                 --自动指定一天时间
--Set @Op_Date=DateAdd(Day,-1,Getdate())  --手动指定一天如“DateAdd(Day,-1,Getdate())”表示昨天的数据
Set @Op_Date=@CurrentDate
Declare @FilePath Varchar(200)  --定义当前日志保存位置
Set @FilePath='D:\GameLog\access'     
Declare @FileName Varchar(200)  --定义今天的文件
Set @FileName= Cast(@ApplicationId As Varchar(20))+'_'+Cast(@SubId As Varchar(20))+'_'+Convert(varchar(10),@Op_Date,112)+'_'+'dbcount.mdb'
Declare @FileAll Varchar(200)   --定义当前文件完整路径
Set @FileAll=@FilePath+'\'+@FileName
Declare @Op Varchar(200)        --定义操作方式
Set @Op='copy '+@FilePath+'\dbcount.mdb ' +@FileAll
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
FROM    Sys_Users_Detail with(nolock)
        Where  Convert(Char(10), date,120)='''+Convert(Char(10),@Op_Date,120)+''' Or Convert(Char(10), lastdate,120)='''+Convert(Char(10),@Op_Date,120)+''' Or Convert(Char(10), LastDateSecond,120)='''+Convert(Char(10),@Op_Date,120)+'''  Or Convert(Char(10), LastDateThird,120)='''+Convert(Char(10),@Op_Date,120)+''' '   
Exec (@SqlString)

 
 


--加入用户充值信息
Set @SqlString='
insert into   OPENROWSET(''Microsoft.Jet.OLEDB.4.0'', '''+@FileAll+''';''admin'';'''', Old_PayMent)
       (ApplicationId,SubId, ChargeID, UserName, Money, Date, CanUse, PayWay, NeedMoney, IP)
SELECT  '+Cast(@ApplicationId As  Varchar(10))+','+Cast(@SubId As  Varchar(10))+', ChargeID, UserName, Money, Date, CanUse, PayWay, NeedMoney, IP
FROM    Charge_Money with(nolock)
        Where Convert(Char(10),date,120)='''+Convert(Char(10),@Op_Date,120)+'''' 
Exec (@SqlString)
End

GO
