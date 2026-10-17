-- SQL_STORED_PROCEDURE dbo.Ddt_Count_MonthLostLog_Sto (modified 2009-05-12T16:44:09.007)








-- =============================================
-- Author:	小危
-- Create date: <Create Date,,>
-- Description:	<统计用户月流失率>

CREATE  PROCEDURE  [dbo].[Ddt_Count_MonthLostLog_Sto]
  @Begin_Date DateTime, 
  @End_Date DateTime,
  @ouototal Int=0 output 
  AS  
  /*第一步:初始化变量*/
  If (@Begin_Date>@End_Date)
      Return  

  

  /*第三步：生成用户需求数据范围*/
  Create Table #Temp_Begin(UserId Varchar(20),BeginDate Varchar(7))
  Create Table #Temp_End(UserId Varchar(20),EndDate Varchar(7))
 
  --定义起始日期变量
  Declare @SqlBegin varchar(400)     
  Declare @SqlEnd varchar(400)       
  Declare @Begin_Month Varchar(7)  
  Set @Begin_Month=Convert(char(7), @Begin_Date,120)

  --定义结束日期变量  
  Declare @End_Month Varchar(7)  
  Set @End_Month=Convert(char(7), @End_Date,120)

  --定义结果
  Declare @Begin_Data Int
  Declare @End_Data Int
  Set @Begin_Data=0
  Set @End_Data=0

  /*第四步:统计出起始日期登陆用户*/
  Set @SqlBegin= '  Select UserId,'''+@Begin_Month+''' As Begin_Date From  Count_UserLoginLog Where LoginMonth='''+@Begin_Month+'''' Insert Into #Temp_Begin
  exec (@SqlBegin)
 
  /*第五步：统计出结束日期登陆用户*/
  Set @SqlEnd= '  Select UserId,'''+@End_Month+''' As Begin_Date From  Count_UserLoginLog Where LoginMonth='''+@End_Month+''''  Insert Into #Temp_End
  exec (@SqlEnd)

  /*第六步：两个结果对比*/
  Select @Begin_Data=Count(*)   From #Temp_Begin   
  Select @End_Data=Count(*)  From   #Temp_End B,#Temp_Begin A  Where B.UserId=A.UserId
  set @ouototal=@Begin_Data-@End_Data

  Drop Table #Temp_Begin
  Drop Table #Temp_End


GO
