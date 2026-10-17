-- SQL_STORED_PROCEDURE dbo.Sp_Auto_Minute_B_Sto (modified 2012-04-21T07:53:24.700)




CREATE     Procedure   [dbo].[Sp_Auto_Minute_B_Sto]
@BeginDate DateTime,
@EndDate DateTime,
@ApplicationId int,
@AgentsID varchar(50),
@Msg varchar(50) output
As
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

Select ApplicationId,SubId as AgentsID,Convert(Char(10),EnterTime,120) As Regdate,sum(Reg) As Reg,max(Online) As Online Into #Temp_Online From  db_logs.dbo.Log_Server
       Where EnterTime>=@BeginDate and EnterTime<=@EndDate and  ApplicationId=@ApplicationId and SubId=@AgentsID
       Group By ApplicationId,SubId,Convert(Char(10),EnterTime,120)     

Select ApplicationId,AgentsID,Convert(Char(10),DateT,120) As Regdate,count(0) as Pay_Man,Sum(NeedMoney) As Pay_Money Into #Temp_Pay From  dbo.Count_PaymentInfo
       Where DateT>=@BeginDate and DateT<=@EndDate and  ApplicationId=@ApplicationId and AgentsID=@AgentsID
       Group By ApplicationId,AgentsID,Convert(Char(10),DateT,120)     

select top 0 * from Auto_MinuteCount_View union all
select A.ApplicationId,A.AgentsID As Client,A.Regdate,IsNull(A.Reg,0) As Reg,IsNull(A.Online,0) As Online,IsNull(B.Pay_Man,0) As Pay_Man,IsNull(B.Pay_Money,0) As Pay_Money from #Temp_Online A
       Left Outer Join #Temp_Pay B
            On A.ApplicationId=B.ApplicationId And A.AgentsID=B.AgentsID And A.Regdate=B.Regdate 

if(@BeginDate='')
begin
set @Msg='请输入日期'
end
else
begin
set @Msg='导出成功'
end
Drop Table #Temp
Drop Table #Temp_Online
Drop Table #Temp_Pay


GO
