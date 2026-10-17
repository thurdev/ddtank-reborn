-- SQL_STORED_PROCEDURE dbo.Sp_Regedit_Month (modified 2012-04-21T07:53:24.983)




CREATE PROCEDURE [dbo].[Sp_Regedit_Month]
-- =============================================
-- Author:		<mike,>
-- ALTER  date: <2010-1-27,,>
-- Description:	<获取注册用户月数据,,>
-- =============================================
@ApplicationId Int,
@SubId Varchar(200),
@BegDate Datetime,
@EndDate Datetime
AS
  /*第一步：计算出时间范围*/
  Create Table #Temp(Reg_Date Varchar(7))
  Declare @i DateTime
  set @i = @BegDate
  While @i < =@EndDate
        Begin 
            Insert Into #Temp(Reg_Date) Values(Convert(Char(7),@i,120))             
            Set @i =dateadd(month,1,@i)  
        End
 
  
  Create Table #TempSub(SubId Int)
  Insert Into #TempSub
         Select Value from dbo.split(@SubId,',')

   /*第二步：计算有效数据*/
   Create Table #Temp_Result(regdate  Varchar(7),reg_data BigInt)   
   Insert Into  #Temp_Result
   Select Convert(VarChar(7),B.EnterTime,120) as regdate,sum(Reg) As Total From  #TempSub A
          Left Outer Join   db_logs.dbo.Log_Server B
               On A.SubId=B.SubId
          Where applicationid=@ApplicationId                
               And Convert(char(10),B.EnterTime,120)>=@BegDate
               And Convert(char(10),B.EnterTime,120)<=@EndDate                            
         Group By Convert(VarChar(7),B.EnterTime,120)

   /*第三步：汇总数据*/           
   Select a.Reg_Date as RegMonth,IsNull(b.reg_data,0) As Total From  #Temp a 
            Left Outer Join #Temp_Result b
            On a.Reg_Date=b.regdate

   /*第四步：删除临时表*/
   Drop Table #Temp
   Drop Table #Temp_Result







GO
