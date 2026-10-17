-- SQL_STORED_PROCEDURE dbo.xSplit (modified 2009-11-19T17:30:25.153)

--功能：拆分字符串
CREATE  procedure xSplit
(
@StringSerial varchar(2000), --要拆分的字符串
@SplitChar char(1)          --拆分的分割字符
)
as
begin
	declare @commaPos int            --保存分割字符的位置
	declare @subString varchar(2000) --保存每个临时子串

	set NOCOUNT ON;
	
	set @commaPos = CHARINDEX(@SplitChar,@StringSerial,0)
	
	if @commaPos=0
	begin
		print '没有包含分割字符'
	   	return
	end
	
	begin tran  --可能批操作，采用事务防出现脏数据
	
	while @commaPos>0
	begin
		set @subString = SUBSTRING(@StringSerial,1,@commaPos-1) --分割出一个子字符串
		print(@subString)
		set @StringSerial=SUBSTRING(@StringSerial,@commaPos+1,Len(@StringSerial))
		set @commaPos=CHARINDEX(@SplitChar,@StringSerial,0)
	end
	
	print(@StringSerial)
	
	if @@error=0
		COMMIT TRAN
	else
		ROLLBACK TRAN
end



GO
