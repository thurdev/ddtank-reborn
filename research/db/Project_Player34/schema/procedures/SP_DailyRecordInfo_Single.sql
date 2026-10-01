-- SQL_STORED_PROCEDURE dbo.SP_DailyRecordInfo_Single (modified 2021-06-04T05:18:35.297)
-- =============================================
-- Author:		<bTh>
-- Create date: <14/09/2017>
-- Description:	<DD Revista>
-- =============================================
CREATE PROCEDURE [dbo].[SP_DailyRecordInfo_Single]
@UserID int
AS
	select * from DailyRecordInfo WHERE UserID = @UserID

GO
