-- SQL_STORED_PROCEDURE dbo.Sp_Log_Search (modified 2012-04-21T07:53:24.497)


-- =============================================
-- Author:		<xiaov>
-- Create date: <2010-04-07>
-- Description:	<查询指定时间的数据>
-- =============================================
CREATE PROCEDURE [dbo].[Sp_Log_Search]
  @Begin_Date DateTime,
  @End_Date DateTime,
  @Search_Type Varchar(200)
AS
BEGIN

if @Search_Type='minute'  
   Begin
     Select '2000-01-01' As Regdate,'10' As HourMinute,0 as Online,0 as Reg,0 as Pay_Man,0 as Pay_Money   --对应生成文件中的Table0
     Union All
     Select EnterTime,EnterHour,max(onlines),max(regs),max(Pay_Mans),max(Pay_Moneys) From (
            Select Convert(char(10),EnterTime,120) As EnterTime, cast(DATEPART(hh, EnterTime)+DATEPART(mi, EnterTime)/5/100.00 as decimal(10,2)) As EnterHour,Max(online) As onlines,Sum(reg) As regs,0 As Pay_Mans,0 As Pay_Moneys From Db_Logs.dbo.Log_Server 
                   Where @Begin_Date<=Convert(char(10),EnterTime,120) And @End_Date>=Convert(char(10),EnterTime,120)
                   Group By  Convert(char(10),EnterTime,120), cast(DATEPART(hh, EnterTime)+DATEPART(mi, EnterTime)/5/100.00 as decimal(10,2))
            Union All
            Select Convert(char(10),Date,120), cast(DATEPART(hh, Date)+DATEPART(mi, Date)/5/100.00 as decimal(10,2)),0,0,Count(0),Sum(NeedMoney) From Db_Tank.dbo.Charge_Money 
                   Where @Begin_Date<=Convert(char(10),Date,120) And @End_Date>=Convert(char(10),Date,120)
                   Group By Convert(char(10),Date,120), cast(DATEPART(hh, Date)+DATEPART(mi, Date)/5/100.00 as decimal(10,2))
             )A Group By EnterTime,EnterHour
   End

if @Search_Type='day'
   Begin
     --查询点卷金币库存              --对应生成文件中的Table0
     Select   CurrentDate,Point,Gold From db_logs.dbo.Log_CollectDay 
            Where Convert(Char(10),CurrentDate,120)>=Convert(Char(10),@Begin_Date,120)
                  And Convert(Char(10),CurrentDate,120)<=Convert(Char(10),@End_Date,120)
     Union All 
     Select '2000-01-01',0,0
              
     --查询活跃用户与登陆数据        --对应生成文件中的Table1
     Select  CurrentDate,ActiveMan,LoginMan From db_logs.dbo.Log_UserDay
            Where Convert(Char(10),CurrentDate,120)>=Convert(Char(10),@Begin_Date,120)
                  And Convert(Char(10),CurrentDate,120)<=Convert(Char(10),@End_Date,120)
     Union All
     Select '2000-01-01',0,0
            
     --查询每日五分钟线              --对应生成文件中的Table2
     Select  Regdate,HourMinute,Reg,Online,Pay_Man,Pay_Money From db_logs.dbo.Log_CollectMinute
             Where Convert(Char(10),Regdate,120)>=Convert(Char(10),@Begin_Date,120)
                   And Convert(Char(10),Regdate,120)<=Convert(Char(10),@End_Date,120)
     Union All
     Select '2000-01-01',0.00,0,0,0,0
             

   End
            
END



GO
