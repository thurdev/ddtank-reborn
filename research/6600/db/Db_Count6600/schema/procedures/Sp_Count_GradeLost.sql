-- SQL_STORED_PROCEDURE dbo.Sp_Count_GradeLost (modified 2012-04-21T07:53:25.217)







-- =============================================
-- Author:	小危
-- Create date: <Create Date,,>
-- Description:	<统计指定等级时间内内1天、3天、7天内没有登陆过的用户数>

CREATE  PROCEDURE  [dbo].[Sp_Count_GradeLost]
  @OneDate DateTime, 
  @ThreeDate DateTime,  
  @WeekDate  DateTime,
  @Grade Int
  AS  
 
    /*第一步：定义变量*/
    --获取用户当前指定等级的用户列表
    Create Table #Sys_Users_Grade(UserID Int)
    Insert Into #Sys_Users_Grade
           Select UserID From Db_Tank.dbo.Sys_Users_Detail with(nolock) Where Grade=@Grade
    --查询后的数据集
    Create Table #Result(BeginDate DateTime,EndDate DateTime,Logins Int)
    
     
 
    /*第二步：计算1天内登陆的用户数*/    	
	Declare @One_Sql Varchar(1000)     --定义查询语句
    Create Table #One_Table(UserId Int)   
    Declare @One_Day DateTime	    
    Set @One_Day=@OneDate
	Set @One_Sql=''
	While @One_Day<=@OneDate      --计算出时间范围内登陆的用户
		 Begin
			  Set @One_Sql='Select UserId From Db_Count.dbo.Count_UserLoginLog A Where Not Exists '
                                 +'( Select UserId From #One_Table B Where A.UserId=B.UserId)'
                                 +' And LoginMonth='''+Convert(Char(7),@One_Day,120)+''''
                                 +' And day'+Cast(Day(@One_Day) As Varchar(2))+'>0' Insert Into #One_Table
			  Exec (@One_Sql)
		      Set @One_Day=dateadd(day,1,@One_Day)                      
		 End
 
 
    Insert into #Result
    Select @OneDate,@OneDate, Count(*) From #Sys_Users_Grade A
             Left Outer Join #One_Table  B
             On A.UserId=B.UserId
             Where IsNull(B.UserId,0)=0


	
    /*第三步：计算3天内登陆的用户数*/
	Declare @Three_Sql Varchar(1000)     --定义查询语句
    Create Table #Three_Table(UserId Int)   
    Declare @Three_Day DateTime	    
    Set @Three_Day=@ThreeDate
	Set @Three_Sql=''
	While @Three_Day<=@OneDate     --计算出时间范围内登陆的用户
		 Begin
			  Set @Three_Sql='Select UserId From Db_Count.dbo.Count_UserLoginLog A Where Not Exists '
                                 +'( Select UserId From #Three_Table C Where A.UserId=C.UserId)'                                 
                                 +' And LoginMonth='''+Convert(Char(7),@Three_Day,120)+''''
                                 +'And day'+Cast(Day(@Three_Day) As Varchar(2))+'>0' Insert Into #Three_Table
			  Exec( @Three_Sql)
		      Set @Three_Day=dateadd(day,1,@Three_Day)                      
		 End

    Insert into #Result
    Select @ThreeDate,@OneDate, Count(*) From #Sys_Users_Grade A 
             Left Outer Join #Three_Table C
             On A.UserId=C.UserId
             Where IsNull(C.UserId,0)=0

 
    /*第四步：计算7天内登陆的用户数*/
	Declare @Week_Sql Varchar(1000)     --定义查询语句
    Create Table #Week_Table(UserId Int)   
    Declare @Week_Day DateTime	    
    Set @Week_Day=@WeekDate
	Set @Week_Sql=''
	While @Week_Day<=@OneDate      --计算出时间范围内登陆的用户
		 Begin
			  Set @Week_Sql='Select UserId From Db_Count.dbo.Count_UserLoginLog A Where Not Exists '
                                 +'( Select UserId From #Week_Table B Where A.UserId=B.UserId)'                                 
                                 +' And LoginMonth='''+Convert(Char(7),@Week_Day,120)+''''
                                 +'And day'+Cast(Day(@Week_Day) As Varchar(2))+'>0' Insert Into #Week_Table
			  Exec( @Week_Sql)
		      Set @Week_Day=dateadd(day,1,@Week_Day)                      
		 End

    Insert into #Result
    Select @WeekDate,@OneDate, Count(*) From #Sys_Users_Grade A 
             Left Outer Join #Week_Table B 
             On A.UserId=B.UserId
             Where IsNull(B.UserId,0)=0

 
    Select * From #Result Order by BeginDate
    Drop Table #Sys_Users_Grade
    Drop Table #One_Table
    Drop Table #Three_Table
    Drop Table #Week_Table
    Drop Table #Result

GO
