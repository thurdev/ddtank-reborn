-- SQL_STORED_PROCEDURE dbo.SP_DailyRecordInfo_Delete (modified 2021-06-04T05:18:35.293)
-- =============================================
-- Author:		<bTh>
-- Create date: <14/09/2017>
-- Description:	<DD Revista>
-- =============================================
CREATE PROCEDURE [dbo].[SP_DailyRecordInfo_Delete]
@UserID int,
@Type int
AS
	delete from DailyRecordInfo WHERE UserID = @UserID AND [Type] = @Type

GO
