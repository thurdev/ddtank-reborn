-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Riches_Remove (modified 2021-06-04T05:18:34.947)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：捐献公会财富>
-- =============================================
CREATE Procedure [dbo].[SP_Consortia_Riches_Remove]
@ConsortiaID int,
@Riches int output
as

declare @OrdRiches int
select @OrdRiches=Riches from Consortia where ConsortiaID=@ConsortiaID and IsExist=1

if @OrdRiches is null 
begin
	return  2
end

if @OrdRiches >= @Riches
begin
	set @OrdRiches = @OrdRiches	 - @Riches
end

update  Consortia set Riches=@OrdRiches  where ConsortiaID=@ConsortiaID

if @@error <> 0
begin
  rollback tran
  return 1
end
select @Riches=Riches from Consortia where ConsortiaID=@ConsortiaID and IsExist=1

return 0








GO
