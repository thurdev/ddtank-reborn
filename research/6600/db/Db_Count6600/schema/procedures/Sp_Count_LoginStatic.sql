-- SQL_STORED_PROCEDURE dbo.Sp_Count_LoginStatic (modified 2012-04-21T07:53:25.123)











-- Author:	xiaov
-- ALTER  date: 2008.12.18
-- Description:	活跃度统计 (某时段内有登录记录的用户数。选择条件：开始和结束时间日期。输出为该时段有登录记录的用户总数，平均登陆次数)
CREATE  PROCEDURE  [dbo].[Sp_Count_LoginStatic] 
@ApplicationId Int,
@SubId Int,
@LoginBeginDate DateTime,
@LoginEndDate DateTime
AS


  Declare @LoginUser_All  Int         --登陆总次数
  Declare @LoginUser_One Int          --用户数(重复登陆只算一次)
  Declare @LoginUser_Ave Numeric(10,2)--平均用户数

  Declare @LoginMan_All Int           --男性玩家
  Declare @LoginMan_One Int           --男性玩家(重复登陆只算一次)
  Declare @LoginMan_Ave Numeric(10,2) --男性玩家平均数

  Declare @LoginWorman_All  Int          --女性玩家
  Declare @LoginWorman_One  Int          --女性玩家(重复登陆只算一次)
  Declare @LoginWorman_Ave  Numeric(10,2)--女性玩家平均数
  

  Set @LoginUser_All=0
  Set @LoginUser_One=0
  Set @LoginUser_Ave=0

  Set @LoginMan_All=0
  Set @LoginMan_One=0
  Set @LoginMan_Ave=0

  Set @LoginWorman_All=0
  Set @LoginWorman_One=0
  Set @LoginWorman_Ave=0


  /*计算不含重复登陆*/
  Select @LoginUser_One=Count(*),@LoginMan_One=IsNull(Sum(LoginMan),0)  ,@LoginWorman_One=IsNull(Sum(LoginWorman),0)  From (
  Select DISTINCT  UserId, Case IsSex When 1 Then 1 Else 0 End  LoginMan, Case IsSex When 0 Then 1 Else 0 End 
  LoginWorman From Count_Login Where ApplicationId=@ApplicationId And SubId=@SubId 
  And  Convert(Char(10), LoginDateTime,120)>=@LoginBeginDate 
  And  Convert(Char(10), LoginDateTime,120)<=@LoginEndDate )A



  /*计算含重复登陆*/
  Select @LoginUser_All=Count(*),@LoginMan_All=IsNull(Sum(LoginMan),0)  ,@LoginWorman_All=IsNull(Sum(LoginWorman),0)  From (
  Select UserId, Case IsSex When 1 Then 1 Else 0 End  LoginMan, Case IsSex When 0 Then 1 Else 0 End 
  LoginWorman From Count_Login Where ApplicationId=@ApplicationId And SubId=@SubId 
  And  Convert(Char(10), LoginDateTime,120)>=@LoginBeginDate 
  And  Convert(Char(10), LoginDateTime,120)<=@LoginEndDate )A


  If(@LoginUser_One>0)  
     Set @LoginUser_Ave=@LoginUser_All/@LoginUser_One 
 
     
 
  
  If(@LoginMan_One>0)
     Set @LoginMan_Ave=@LoginMan_All/@LoginMan_One
 


  If(@LoginWorman_One>0)
     Set @LoginWorman_Ave=@LoginWorman_All/@LoginWorman_One
 


  Select @LoginUser_All As LoginUser_All,@LoginUser_One As LoginUser_One,@LoginUser_Ave As LoginUser_Ave,
         @LoginMan_All As LoginMan_All,@LoginMan_One As LoginMan_One,@LoginMan_Ave As LoginMan_Ave,
         @LoginWorman_All As LoginWorman_All,@LoginWorman_One As LoginWorman_One,@LoginWorman_Ave As LoginWorman_Ave









GO
