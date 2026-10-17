-- SQL_STORED_PROCEDURE dbo.Count_Regedit_Day (modified 2012-04-21T07:53:24.763)









-- =============================================
-- Author:		<mike,>
-- ALTER  date: <2010-1-25,,>
-- Description:	<获取在线用户数据,,>
-- =============================================

CREATE PROCEDURE [dbo].[Count_Regedit_Day]
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
/*第二步：汇总数据*/           
   Create Table #Temp_Result(regdate Datetime,reg_data BigInt)
   Insert Into  #Temp_Result
   Select  Convert(Char(10),B.EnterTime,120) As Regdate,Sum(Reg)  From #TempSub A
           Left Outer Join  db_logs.dbo.Log_Server B
                On A.SubId=B.SubId
           Where B.applicationid=@ApplicationId
               And Reg>0               
               And  Convert(Char(10),B.EnterTime,120)>=@BegDate
               And  Convert(Char(10),B.EnterTime,120)<=@EndDate                          
         Group By  Convert(Char(10),B.EnterTime,120)


/*第三步：生成结果*/ 
   Select a.Reg_Date as RegDay,IsNull(b.reg_data,0) As Total From  #Temp a 
            Left Outer Join #Temp_Result b
            On a.Reg_Date=b.regdate
            Order by a.Reg_Date 
/*第四步:删除临时表*/
  Delete from #Temp
  Delete from #Temp_Result




GO
