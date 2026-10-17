-- SQL_STORED_PROCEDURE dbo.SP_Insert_Count_Server (modified 2015-01-25T14:04:48.140)
-- =============================================
-- Author:		Justin
-- Create date: 2008.11.26
-- Description:	记录服务器人数
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Count_Server]
		@ApplicationId				int,
		@SubId						int,
		@ServerId					int,
		@UserCount					int,
		@GameCount					int,
		@DateTime					datetime
AS
BEGIN
	INSERT INTO Db_Count..Count_Application_Server
           ([ApplicationId]
           ,[SubId]
           ,[LineId]
           ,[UserCount]
           ,[GameCount]
           ,[DateTime])
     VALUES
           (@ApplicationId,@SubId,@ServerId,@UserCount,@GameCount,@DateTime)
END

GO
