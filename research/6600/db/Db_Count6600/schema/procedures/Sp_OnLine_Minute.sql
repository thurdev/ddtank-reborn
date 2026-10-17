-- SQL_STORED_PROCEDURE dbo.Sp_OnLine_Minute (modified 2012-04-21T07:53:24.733)

CREATE  PROCEDURE [dbo].[Sp_OnLine_Minute]
-- =============================================
-- Author:		<mike>
-- ALTER  date: <2010-1-25,>
-- Description:	<获取在五分钟线用户数据>
-- =============================================
@ApplicationId Int,
@SubId Varchar(200),
@BegDate Datetime
AS
  /*第一步：计算出时间范围*/
  Declare @i Int
  Declare @j Numeric(10,2)
  Set @i=0
  Create Table #Temp(Reg_Date Numeric(10,2))

  While @i < =23
        Begin
           Set @j=0
           While @j<=0.11
                 Begin                   
					   Insert Into #Temp(Reg_Date) Values(@i+@j)             
					   Set @j=@j+0.01                  
                 End           
           Set @i=@i+1
        End
  Create Table #TempSub(SubId Int)
  Insert Into #TempSub
         Select Value from dbo.split(@SubId,',')

   /*第二步:在线用户*/ 
   Create Table #Temp_Result(regdate Numeric(10,2),Total BigInt)
   Insert Into  #Temp_Result   
   Select Cast(DATEPART(hh, EnterTime)+DATEPART(mi, EnterTime)/5/100.00 as decimal(10,2)) As RegMinute,max(Online) As Total from #TempSub A
          Left Outer Join  db_logs.dbo.Log_Server B
               On A.Subid=B.SubId
          Where B.ApplicationID=@ApplicationId
                And Convert(Char(10),B.EnterTime ,120)=@BegDate
                And Online>0                
          Group By Cast(DATEPART(hh, B.EnterTime)+DATEPART(mi, B.EnterTime)/5/100.00 as decimal(10,2)) 
               
 
    /*第三步：汇总数据*/           
	If (Convert(Char(10),getdate(),120)=@BegDate)
		Begin                   
			Select   a.Reg_Date as RegMinute,Isnull(b.Total,0) as Total From  #Temp a 
	            Left Outer Join #Temp_Result b
		        On a.Reg_Date=b.regdate           
			   
            order by a.reg_date
		End
	Else
		Begin
			Select   a.Reg_Date as RegMinute,Isnull(b.Total,0) As Total From  #Temp a 
				Left Outer Join #Temp_Result b
				On a.Reg_Date=b.regdate                   
            order by a.reg_date
		End

   /*第四步：删除临时表*/
   Drop Table #Temp
   Drop Table #Temp_Result







GO
