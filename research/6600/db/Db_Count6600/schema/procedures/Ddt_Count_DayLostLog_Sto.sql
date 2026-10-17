-- SQL_STORED_PROCEDURE dbo.Ddt_Count_DayLostLog_Sto (modified 2009-05-12T14:18:04.880)









-- =============================================
-- Author:	小危
-- Create date: <Create Date,,>
-- Description:	<统计用户日流失>

CREATE  PROCEDURE  [dbo].[Ddt_Count_DayLostLog_Sto]
  @Begin_Date DateTime, 
  @End_Date DateTime,
  @ouototal Int=0 output 
  AS  
  /*第一步:初始化变量*/
  If (@Begin_Date>@End_Date)
      Return  

  

  /*第三步：生成用户需求数据范围*/
  Create Table #Temp_Begin(UserId Varchar(20),BeginDate DateTime)
  Create Table #Temp_End(UserId Varchar(20),EndDate DateTime)
 
  --定义起始日期变量    
  Declare @Begin_Day Varchar(2)
  Declare @Begin_Month Varchar(7)
  Set @Begin_Day=Day(@Begin_Date)
  Set @Begin_Month=Convert(char(7), @Begin_Date,120)

  --定义结束日期变量
  Declare @End_Day Varchar(2)
  Declare @End_Month Varchar(7)
  Set @End_Day=Day(@End_Date)
  Set @End_Month=Convert(char(7), @End_Date,120)

  --定义结果
  Declare @SqlBegin varchar(800)     
  Declare @SqlEnd varchar(800)   
  Declare @Begin_Data Int
  Declare @End_Data Int
  Set @Begin_Data=0
  Set @End_Data=0

  /*第四步:统计出起始日期登陆用户*/
  Set @SqlBegin= '  Select UserId,'''+Convert(Char(10),@Begin_Date,120)+'''  From  Count_UserLoginLog Where LoginMonth='''+@Begin_Month+''' And Day'+@Begin_Day+'>0' Insert Into #Temp_Begin
  exec (@SqlBegin)
 
  /*第五步：统计出结束日期登陆用户*/
  Set @SqlEnd= '  Select UserId,'''+Convert(Char(10),@End_Date,120)+'''   From  Count_UserLoginLog Where LoginMonth='''+@End_Month+''' And Day'+@End_Day+'>0' Insert Into #Temp_End
  exec (@SqlEnd)

  

  /*第六步：两个结果对比*/
  Select @Begin_Data=Count(*)   From #Temp_Begin   
  Select @End_Data=Count(*)  From   #Temp_End B,#Temp_Begin A  Where B.UserId=A.UserId
  
Select *  From   #Temp_Begin A,#Temp_End B  Where A.UserId=B.UserId
  
  Select   @Begin_Data
  Select   @End_Data
set @ouototal=@Begin_Data-@End_Data

  Drop Table #Temp_Begin
  Drop Table #Temp_End



GO
