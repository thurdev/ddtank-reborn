-- SQL_STORED_PROCEDURE dbo.Ddt_UserStopHistory_Sto (modified 2012-04-21T07:53:25.200)

CREATE  PROCEDURE  [dbo].[Ddt_UserStopHistory_Sto]
-- Author:andy -- Date:2009-09-07  -- Description:账号停封历史记录存储过程
@UserName Nvarchar(50), 
@StopTime varchar(50),
@StopReason varchar(50),
@OperateTime varchar(50),
@OperateType int,
@NickName Nvarchar(50),
@Msg NVarchar(50) OUTPUT
  AS  
select @nickName
BEGIN
INSERT INTO [Db_Count].[dbo].[Count_UserStopHistory]
           ([UserName]
           ,[StopTime]
           ,[StopReason]
           ,[OperateTime]
           ,[OperateType]
           ,[NickName])
     VALUES
           (@UserName,@StopTime,@StopReason,@OperateTime,@OperateType,@NickName)
set @Msg=@@ROWCOUNT
END
GO
