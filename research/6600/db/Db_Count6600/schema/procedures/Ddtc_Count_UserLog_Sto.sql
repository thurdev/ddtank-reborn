-- SQL_STORED_PROCEDURE dbo.Ddtc_Count_UserLog_Sto (modified 2010-04-19T21:47:25.187)









CREATE  PROCEDURE [dbo].[Ddtc_Count_UserLog_Sto] 
@Date DateTime
AS
Declare @Days Varchar(2)
Declare @LoginMonth Varchar(7)
Set @Days=Day(@Date)
Set @LoginMonth=Convert(char(7),@Date,120)
Declare @SqlStr Varchar(1000)     --定义查询语句


Set @SqlStr=' Select  TOP 60000 B.UserID, B.UserName, B.NickName, B.Date, B.Sex, B.GP, B.Gold, B.Money 
        From  Db_Logs.dbo.Log_UserLoginLog A 
              Left Outer Join Db_Tank.dbo.Sys_Users_Detail B
        On A.UserId =B.UserId  
              Where A.LoginMonth='''+@LoginMonth+''' And A.Day'+@Days+'>0'
              
Exec (@SqlStr)



GO
