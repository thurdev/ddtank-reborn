-- SQL_STORED_PROCEDURE dbo.Sp_Count_UserPoint (modified 2012-04-21T07:53:24.640)















-- =============================================
-- Author:	小危
-- ALTER  date: <ALTER  Date,,>
-- Description:	<统计点券存量>

CREATE  PROCEDURE  [dbo].[Sp_Count_UserPoint]
  @Begin_Date DateTime, 
  @End_Date DateTime
  As


  /*第一步:初始化变量*/
  If (@Begin_Date>@End_Date)
      Return  
  Declare @i DateTime
  Set @i=@Begin_Date                   --起始时间
  Declare @SqlString Varchar(8000)     --查询语句

  /*第二步：以月为单位汇总数据*/
  Create Table #Temp_Login(LoginMonth Varchar(7), Day1 BigInt,Day2 BigInt,Day3 BigInt,Day4 BigInt,Day5 BigInt,Day6 BigInt,Day7 BigInt,Day8 BigInt,Day9 BigInt,Day10 BigInt,Day11 BigInt,Day12 BigInt,Day13 BigInt,Day14 BigInt,Day15 BigInt,Day16 BigInt,Day17 BigInt,Day18 BigInt,Day19 BigInt,Day20 BigInt,Day21 BigInt,Day22 BigInt,Day23 BigInt,Day24 BigInt,Day25 BigInt,Day26 BigInt,Day27 BigInt,Day28 BigInt,Day29 BigInt,Day30 BigInt,Day31 BigInt)
  Insert Into  #Temp_Login
  Select LoginMonth,Sum(Day1),Sum(Day2),Sum(Day3),Sum(Day4),Sum(Day5),Sum(Day6),Sum(Day7),Sum(Day8),Sum(Day9),Sum(Day10),Sum(Day11),Sum(Day12),Sum(Day13),Sum(Day14),Sum(Day15),Sum(Day16),Sum(Day17),Sum(Day18),Sum(Day19),Sum(Day20),Sum(Day21),Sum(Day22),Sum(Day23),Sum(Day24),Sum(Day25),Sum(Day26),Sum(Day27),Sum(Day28),Sum(Day29),Sum(Day30),Sum(Day31) From  Count_UserPointLog
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
