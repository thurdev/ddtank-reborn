-- SQL_STORED_PROCEDURE dbo.Ddtc_Count_RegeditPay_Sto (modified 2012-04-21T07:53:24.687)


-- =============================================
-- Author:	小危
-- ALTER  date: <ALTER  Date,,>
-- Description:	<用户注册到付费周期>
-- alteror: watson
-- alterDescription: 将利用username的条件查询改为用nickname的条件查询
-- alterDate: 2009-10-21
-- =============================================
CREATE  PROCEDURE [dbo].[Ddtc_Count_RegeditPay_Sto] 
@Begin_Date DateTime, 
@End_Date DateTime
AS
   /*第一步：创建昨时表*/
   Create Table #temp(NickName Varchar(100),DiffDay Int)  

   /*第二步：用户注册时间与付费时间*/
   Insert Into #temp
   Select A.NickName,DATEDIFF(day,A.Date,B.PayDay)As DiffDay From Db_Tank.dbo.Sys_Users_Detail A with(nolock)
          Left Outer Join   ( Select  NickName As PayUser,Min(Date)as PayDay From Db_Tank.dbo.Charge_Money with(nolock)     
                Where Date>=@Begin_Date And Date<=@End_Date
          Group By  NickName) B
          On A.NickName=B.PayUser
  Where DATEDIFF(day,A.Date,B.PayDay)>0  And A.Date>=@Begin_Date And A.Date<=@End_Date
                
   /*第三步：用户分组*/
   Select DiffDay,Count(*) As UserCount From #temp
       Group By DiffDay
       Order By DiffDay 
   Drop Table #temp

 





GO
