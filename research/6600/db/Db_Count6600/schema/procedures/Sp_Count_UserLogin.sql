-- SQL_STORED_PROCEDURE dbo.Sp_Count_UserLogin (modified 2012-04-21T07:53:24.373)



-- =============================================
-- Author:	小危
-- Create date: <Create Date,,>
-- Description:	<统计用户登陆次数>

CREATE  PROCEDURE  [dbo].[Sp_Count_UserLogin]
  @Begin_Date DateTime, 
  @End_Date DateTime
  AS  
  /*第一步:初始化变量*/
  If (@Begin_Date>@End_Date)
      Return  
  Declare @i DateTime
  Set @i=@Begin_Date                   --起始时间
  Declare @SqlString Varchar(8000)     --查询语句


  /*第二步：以月为单位汇总数据*/
  Create Table #Temp_Login(LoginMonth Varchar(7), Day1 bigInt,Day2 bigInt,Day3 bigInt,Day4 bigInt,Day5 bigInt,Day6 bigInt,Day7 bigInt,Day8 bigInt,Day9 bigInt,Day10 bigInt,Day11 bigInt,Day12 bigInt,Day13 bigInt,Day14 bigInt,Day15 bigInt,Day16 bigInt,Day17 bigInt,Day18 bigInt,Day19 bigInt,Day20 bigInt,Day21 bigInt,Day22 bigInt,Day23 bigInt,Day24 bigInt,Day25 bigInt,Day26 bigInt,Day27 bigInt,Day28 bigInt,Day29 bigInt,Day30 bigInt,Day31 bigInt)
  Insert Into  #Temp_Login
  Select LoginMonth,Sum(Day1),Sum(Day2),Sum(Day3),Sum(Day4),Sum(Day5),Sum(Day6),Sum(Day7),Sum(Day8),Sum(Day9),Sum(Day10),Sum(Day11),Sum(Day12),Sum(Day13),Sum(Day14),Sum(Day15),Sum(Day16),Sum(Day17),Sum(Day18),Sum(Day19),Sum(Day20),Sum(Day21),Sum(Day22),Sum(Day23),Sum(Day24),Sum(Day25),Sum(Day26),Sum(Day27),Sum(Day28),Sum(Day29),Sum(Day30),Sum(Day31) From  Db_Logs.dbo.Log_UserLoginLog
       Group By LoginMonth

 


  /*第三步：生成用户需求数据范围*/
  Create Table #Temp(RegDate Datetime,LoginCount bigInt)
  Declare @j DateTime
  set @j = @Begin_Date
  While @j <= @End_Date
        Begin 
          Insert Into #Temp(RegDate,LoginCount) Values(@j,0)                       
          Set @j =dateadd(day,1,@j)  
        End
 


  /*第四步:关联数据*/
  Select A.RegDate, 'Total'=Case When Day(A.RegDate)=1 Then Day1
                                       When Day(A.RegDate)=2 Then Day2
                                       When Day(A.RegDate)=3 Then Day3
                                       When Day(A.RegDate)=4 Then Day4
                                       When Day(A.RegDate)=5 Then Day5
                                       When Day(A.RegDate)=6 Then Day6
                                       When Day(A.RegDate)=7 Then Day7
                                       When Day(A.RegDate)=8 Then Day8
                                       When Day(A.RegDate)=9 Then Day9
                                       When Day(A.RegDate)=10 Then Day10
                                       When Day(A.RegDate)=11 Then Day11
                                       When Day(A.RegDate)=12 Then Day12
                                       When Day(A.RegDate)=13 Then Day13
                                       When Day(A.RegDate)=14 Then Day14
                                       When Day(A.RegDate)=15 Then Day15
                                       When Day(A.RegDate)=16 Then Day16
                                       When Day(A.RegDate)=17 Then Day17
                                       When Day(A.RegDate)=18 Then Day18
                                       When Day(A.RegDate)=19 Then Day19
                                       When Day(A.RegDate)=20 Then Day20
                                       When Day(A.RegDate)=21 Then Day21
                                       When Day(A.RegDate)=22 Then Day22
                                       When Day(A.RegDate)=23 Then Day23
                                       When Day(A.RegDate)=24 Then Day24
                                       When Day(A.RegDate)=25 Then Day25
                                       When Day(A.RegDate)=26 Then Day26
                                       When Day(A.RegDate)=27 Then Day27
                                       When Day(A.RegDate)=28 Then Day28
                                       When Day(A.RegDate)=29 Then Day29
                                       When Day(A.RegDate)=30 Then Day30
                                       When Day(A.RegDate)=31 Then Day31                                       
                                       Else 0 End From #Temp A, #Temp_Login B
           Where Convert(Char(7),A.RegDate,120)=B.LoginMonth

  /*第五步：删除临时表数据*/
  Drop Table #Temp
  Drop Table #Temp_Login


GO
