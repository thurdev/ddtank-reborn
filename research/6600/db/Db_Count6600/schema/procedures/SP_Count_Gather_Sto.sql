-- SQL_STORED_PROCEDURE dbo.SP_Count_Gather_Sto (modified 2012-04-21T07:53:25.200)

-- =============================================
-- Author:		<andy>
-- Create date: <2009-12-10>
-- Description:	<返回代理商的在线、注册、充值人数、充值金额数据>
-- =============================================
Create proc SP_Count_Gather_Sto
@Datetime datetime,
@type varchar(10)
as
begin
select * from Count_OnlineInfo
if(@@error <> 0)
begin
  return 1
end
return 0
end
GO
