-- SQL_STORED_PROCEDURE dbo.Sp_Count_ItemData (modified 2012-04-21T07:53:24.577)

-- =============================================
-- Author:	Jason
-- ALTER  date: <2010-03-09>
-- Description:	<统计物品销售排行榜>

CREATE  PROCEDURE  [dbo].[Sp_Count_ItemData]
  @Begin_Date DateTime, 
  @End_Date DateTime,
  @Catalog Varchar(200)
  AS  
  /*第一步:初始化变量*/
  If (@Begin_Date>@End_Date)
      Return  
  Declare @i DateTime
  Set @i=@Begin_Date                   --起始时间
  Declare @SqlString Varchar(8000)     --查询语句


  /*第二步：以月为单位汇总数据*/
  Create Table #Temp_Login(LoginMonth Varchar(7), TemplateId Int,Day1 Int,Day2 Int,Day3 Int,Day4 Int,Day5 Int,Day6 Int,Day7 Int,Day8 Int,Day9 Int,Day10 Int,Day11 Int,Day12 Int,Day13 Int,Day14 Int,Day15 Int,Day16 Int,Day17 Int,Day18 Int,Day19 Int,Day20 Int,Day21 Int,Day22 Int,Day23 Int,Day24 Int,Day25 Int,Day26 Int,Day27 Int,Day28 Int,Day29 Int,Day30 Int,Day31 Int)
  Insert Into  #Temp_Login
  Select LoginMonth,TemplateId,Sum(Day1),Sum(Day2),Sum(Day3),Sum(Day4),Sum(Day5),Sum(Day6),Sum(Day7),Sum(Day8),Sum(Day9),Sum(Day10),Sum(Day11),Sum(Day12),Sum(Day13),Sum(Day14),Sum(Day15),Sum(Day16),Sum(Day17),Sum(Day18),Sum(Day19),Sum(Day20),Sum(Day21),Sum(Day22),Sum(Day23),Sum(Day24),Sum(Day25),Sum(Day26),Sum(Day27),Sum(Day28),Sum(Day29),Sum(Day30),Sum(Day31) From  Count_ItemDataLog
       Group By LoginMonth,TemplateId

  

  /*第三步：生成用户需求数据范围*/
  Create Table #Temp(RegDate Datetime,LoginCount Int)
  Declare @j DateTime
  set @j = @Begin_Date
  While @j <= @End_Date
        Begin 
          Insert Into #Temp(RegDate,LoginCount) Values(@j,0)                       
          Set @j =dateadd(day,1,@j)  
        End
 


  /*第四步:关联数据*/
  Create Table  #Temp_TemplateId(TemplateId Int,LoginCount Int)
  Insert Into #Temp_TemplateId
  Select B.TemplateId, 'Total'=Case When Day(A.RegDate)=1 Then Day1
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

 
  /*第五步：关联其他*/        
  Select A.TemplateId,A.Name,IsNull(B.LoginCount,0) As LoginCount From Db_Tank_Copy.dbo.Shop_Goods A Left Outer Join
          (Select TemplateId,Sum(LoginCount) As LoginCount From #Temp_TemplateId            
           Group By TemplateId) B           
  On A.TemplateId=B.TemplateId
           Where CharIndex(','+Cast(A.CategoryID As Varchar(20))+',',','+@Catalog+',')>0  
         Order By LoginCount Desc
  /*第六步：删除临时表数据*/
  Drop Table #Temp
  Drop Table #Temp_Login
  Drop Table #Temp_TemplateId
 












GO
