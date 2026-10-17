-- SQL_STORED_PROCEDURE dbo.Ddt_Count_WeekLostLog_Sto (modified 2009-05-12T16:44:01.600)









-- =============================================
-- Author:	小危
-- Create date: <Create Date,,>
-- Description:	<统计用户周流失率>

CREATE  PROCEDURE  [dbo].[Ddt_Count_WeekLostLog_Sto]
  @Begin_Date DateTime, 
  @End_Date DateTime,
  @ouototal Int=0 output 
  AS  
  /*第一步:初始化变量*/
  If (@Begin_Date>@End_Date)
      Return  

  

  /*第二步：生成用户需求数据范围*/
  Create Table #Temp_Begin(UserId Varchar(20),BeginDate DateTime)
  Create Table #Temp_End(UserId Varchar(20),EndDate DateTime)
 
  --定义开始时间
  Declare @Begin_week DateTime  
  Set @Begin_week=dateadd(day,8-DATEPART (dw,@Begin_Date), @Begin_Date)     

  --定义结束时间
  Declare @End_week DateTime  
  Set @End_week=dateadd(day,8-DATEPART (dw,@End_Date), @End_Date)     

  --定义结果
  Declare @SqlBegin Varchar(2000)
  Declare @SqlEnd  Varchar(2000)
  Declare @Begin_Data Int
  Declare @End_Data Int
  Set @Begin_Data=0
  Set @End_Data=0


  /*第三步:统计出起始周登陆用户*/
  Set @SqlBegin= ' Select UserId,'''+Convert(Char(10),@Begin_week,120)+'''   as BeginDate from Count_UserLoginLog Where LoginMonth>='''+Convert(char(7),@Begin_week,120)+''' And LoginMonth<='''+Convert(char(7),dateadd(day,6,@Begin_week),120)+ ''' And day'+Cast(Day(@Begin_week) As Varchar(2))+' +day'+Cast(Day(dateadd(day,1,@Begin_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,2,@Begin_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,3,@Begin_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,4,@Begin_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,5,@Begin_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,6,@Begin_week)) As Varchar(2))+ '>0'  Insert Into #Temp_Begin
  exec (@SqlBegin)

 
  /*第四步：统计出结束日期登陆用户*/
  Set @SqlEnd= ' Select UserId,'''+Convert(Char(10),@End_week,120)+'''   as EndDate from Count_UserLoginLog Where LoginMonth>='''+Convert(char(7),@End_week,120)+''' And LoginMonth<='''+Convert(char(7),dateadd(day,6,@End_week),120)+ ''' And day'+Cast(Day(@End_week) As Varchar(2))+' +day'+Cast(Day(dateadd(day,1,@End_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,2,@End_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,3,@End_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,4,@End_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,5,@End_week)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,6,@End_week)) As Varchar(2))+ '>0'  Insert Into #Temp_End
  exec (@SqlEnd)
--
  /*第五步：两个结果对比*/
  Select @Begin_Data=Count(*)   From #Temp_Begin   
  Select @End_Data=Count(*)  From   #Temp_End B,#Temp_Begin A  Where B.UserId=A.UserId
  set @ouototal=@Begin_Data-@End_Data

  Drop Table #Temp_Begin
  Drop Table #Temp_End



GO
