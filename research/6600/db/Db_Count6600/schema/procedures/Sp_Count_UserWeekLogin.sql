-- SQL_STORED_PROCEDURE dbo.Sp_Count_UserWeekLogin (modified 2010-04-19T22:01:35.450)






-- =============================================
-- Author:	小危
-- Create date: <Create Date,,>
-- Description:	<统计周用户登陆次数>

CREATE  PROCEDURE  [dbo].[Sp_Count_UserWeekLogin]
  @Begin_Date DateTime, 
  @End_Date DateTime  
  AS  
  /*第一步:初始化变量*/
  If (@Begin_Date>@End_Date)
      Return  
  Declare @i DateTime
  Set @i=@Begin_Date              --起始时间
  Declare @SqlString varchar(400)     --查询语句




  /*第二步：生成临时表*/ 
  Create Table #Temp_Login(BeginDate DateTime,EndDate DateTime, Logins Int)


  
  /*第三步：插入临时表中*/
  Declare @k DateTime
  Declare @temp_str varchar(2000)
  Set @k=dateadd(day,8-DATEPART (dw,@Begin_Date), @Begin_Date)
  Set @SqlString=''
  While @k<@End_Date
     Begin
        Set @SqlString= ' Select '''+Convert(Char(10),@k,120)+''' as BeginDate,'''+Convert(Char(10),dateadd(day,6,@k),120)+''' as EndDate,count(*) as logins from Db_Logs.dbo.Log_UserLoginLog Where LoginMonth>='''
                        +Convert(char(7),@k,120)+''' And LoginMonth<='''+Convert(char(7),dateadd(day,6,@k),120)+ ''' And day'+Cast(Day(@k) As Varchar(2))+' +day'+Cast(Day(dateadd(day,1,@k)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,2,@k)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,3,@k)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,4,@k)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,5,@k)) As Varchar(2))+' +day'+Cast(Day(dateadd(day,6,@k)) As Varchar(2))+ '>0'  Insert Into #Temp_Login
        Exec (@SqlString)
        
        Set @k=dateadd(Week,1,@k)                      
     End

  /*第四步：数据汇总*/
  Select * From #Temp_Login
  Drop Table  #Temp_Login
 













GO
