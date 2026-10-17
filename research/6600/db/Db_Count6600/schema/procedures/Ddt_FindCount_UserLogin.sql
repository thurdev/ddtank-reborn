-- SQL_STORED_PROCEDURE dbo.Ddt_FindCount_UserLogin (modified 2009-05-18T17:44:08.420)


CREATE  PROCEDURE [dbo].[Ddt_FindCount_UserLogin]
	@BeginDate DateTime,
    @EndDate DateTime
AS
BEGIN
  /*定义查询条件*/
  Declare @SqlString varchar(400)     --查询语句
  Create Table #Temp_Login(UserId Int)

  /*查询指定时间内登陆过用户*/
  Set @SqlString=''
  While @BeginDate<=@EndDate
     Begin
          Set @SqlString='Select UserId From Count_UserLoginLog A Where Not Exists '
                                 +'( Select UserId From #Temp_Login B Where A.UserId=B.UserId)'
                                 +'And day'+Cast(Day(dateadd(day,1,@BeginDate)) As Varchar(2))+'>0' Insert Into #Temp_Login
          Exec (@SqlString)
        
        Set @BeginDate=dateadd(day,1,@BeginDate)                      
     End

  /*返回查询结果*/
  Select * From #Temp_Login
  Drop Table #Temp_Login
END



GO
