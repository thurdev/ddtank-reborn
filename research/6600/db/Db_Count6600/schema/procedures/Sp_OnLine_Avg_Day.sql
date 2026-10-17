-- SQL_STORED_PROCEDURE dbo.Sp_OnLine_Avg_Day (modified 2012-04-21T07:53:24.983)









CREATE PROCEDURE [dbo].[Sp_OnLine_Avg_Day]
-- =============================================
-- Author:		<mike,>
-- ALTER  date: <2010-1-27,,>
-- Description:	<获取平均在线用户数据,,>
-- =============================================
@ApplicationId Int,
@SubId Varchar(200),
@BegDate Datetime,
@EndDate Datetime
AS
  /*第一步：计算出时间范围*/
  Create Table #Temp(Reg_Date Datetime)
  Declare @i DateTime
  set @i = @BegDate
  While @i <= @EndDate
        Begin 
            Insert Into #Temp(Reg_Date) Values(@i)             
            Set @i =dateadd(day,1,@i)  
        End


  Create Table #TempSub(SubId Int)
  Insert Into #TempSub
  select Value from dbo.split(@SubId,',')

  /*第二步：计算有效数据将要更新*/
  Create Table #Temp_Result(regdate datetime,online_data BigInt)
  Insert Into  #Temp_Result    
         Select regdate,Sum(Online_Data)/count(*) From(
         Select Convert(char(10),B.EnterTime,120) as regdate, sum(Online)  as Online_Data From #TempSub A
                Left Outer Join db_logs.dbo.Log_Server B
                On A.SubId=B.SubId
                Where applicationid=@ApplicationId
                      And Online>0                      
                      And Convert(char(10),B.EnterTime,120)>=@BegDate
                      And Convert(char(10),B.EnterTime,120)<=@EndDate
                Group By Convert(char(10),B.EnterTime,120),Cast(DATEPART(hh, B.EnterTime)+DATEPART(mi, B.EnterTime)/5/100.00 as decimal(10,2)) 
         ) A
        Group by regdate 
        Having count(*)>0


 
   /*第三步：汇总数据*/           
   Select a.Reg_Date as RegDay,IsNull(b.online_data,0) As Total From  #Temp a 
            Left Outer Join #Temp_Result b
            On a.Reg_Date=b.regdate
            Order By a.Reg_Date
   /*第四步：删除临时表*/
   Drop Table #Temp
   Drop Table #Temp_Result






GO
