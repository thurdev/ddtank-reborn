-- SQL_STORED_PROCEDURE dbo.sp_RegeditCount_Month (modified 2012-04-21T07:53:25.123)




CREATE  proc [dbo].[sp_RegeditCount_Month]
-- =============================================
-- Author:		<mike,>
-- ALTER  date: <2010-1-27,,>
-- Description:	<获取注册用户月数据,,>
-- =============================================
@ApplicationId Int,
@SubId Varchar(200),
@BegDate Datetime,
@EndDate Datetime,
@Msg varchar(50) output
as  
select ApplicationId,SubId as AgentsID, SUBSTRING(CONVERT(varchar,EnterTime, 120), 1, 7) as RegDate,sum(Reg) as reg,sum(Online) as Online Into #Temp_Online 
 from db_logs.dbo.Log_Server where EnterTime>=@BegDate and EnterTime<=@EndDate and ApplicationId=@ApplicationId and SubId= @SubId
group by ApplicationId,SubId,SUBSTRING(CONVERT(varchar,EnterTime, 120), 1, 7)

Select ApplicationId,AgentsID,SUBSTRING(CONVERT(varchar,DateT, 120), 1, 7) As RegDate,Count(0) as Pay_Man,Sum(NeedMoney) As Pay_Money Into #Temp_Pay From  dbo.Count_PaymentInfo
    where DateT>=@BegDate and DateT<=@EndDate and ApplicationId=@ApplicationId and AgentsID= @SubId    
       Group By ApplicationId,AgentsID,SUBSTRING(CONVERT(varchar,DateT, 120), 1, 7)       

 

select top 0 * from Reg_MinuteCount_View union all
select A.ApplicationId,A.AgentsID As Client,A.RegDate,
 IsNull(A.Reg,0) As Reg,IsNull(A.Online,0) As Online,IsNull(B.Pay_Man,0) As Pay_Man,IsNull(B.Pay_Money,0) As Pay_Money from #Temp_Online A
       Left Outer Join #Temp_Pay B
            On A.ApplicationId=B.ApplicationId And A.AgentsID=B.AgentsID And A.Regdate=B.Regdate 
   if(@BegDate='')
begin
set @Msg='请输入日期'
end
else
begin
set @Msg='导出成功'
end
Drop Table #Temp_Pay
 Drop Table #Temp_Online





GO
