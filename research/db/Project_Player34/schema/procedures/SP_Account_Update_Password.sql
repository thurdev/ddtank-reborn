-- SQL_STORED_PROCEDURE dbo.SP_Account_Update_Password (modified 2021-06-04T05:18:34.363)


-- =============================================
-- Author:		<TrieuLSL>
-- Create date: <20/9/2011,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE  [dbo].[SP_Account_Update_Password]
	-- Add the parameters for the stored procedure here
@UserID varchar(200),
@PassWord varchar(200)
AS
begin

Update [dbo].[Sys_Users_Detail]
set Password=@PassWord
where UserID=@UserID
return 0
end







GO
